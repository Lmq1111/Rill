import type {
  BotConnectionDiagnostic,
  BotConnectionView,
  BotRuntimeStatusView,
  BotSettingsView,
} from "../../lib/types";
import type { Channel, Project, Session } from "../state/visualStore";

export type ChannelPatch = Partial<Pick<
  Channel,
  "name" | "enabled" | "projectId" | "policy" | "whitelistOn" | "users" | "groups"
>>;

function uniqueTrimmed(values: readonly string[] | null | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

function channelType(connection: Pick<BotConnectionView, "provider" | "domain">): Channel["type"] {
  if (connection.provider === "qq") return "QQ";
  if (connection.provider === "weixin") return "微信";
  return "飞书/Lark";
}

function connectionState(
  bot: BotSettingsView,
  connection: BotConnectionView,
  runtime: BotRuntimeStatusView | null | undefined,
  diagnostic: BotConnectionDiagnostic | undefined,
): Channel["connState"] {
  const adapter = runtime?.adapters?.find((candidate) => candidate.id === connection.id);
  if (diagnostic?.phase === "credential" && diagnostic.status !== "ok") return "credExpired";
  if (!connection.credential.secretSet) return "credExpired";
  if (adapter?.status === "error" || adapter?.status === "degraded" || adapter?.status === "closed") return "failed";
  if (adapter?.status === "running") return "connected";
  if (connection.status === "error" || connection.lastError.trim() || diagnostic?.status === "error") return "failed";
  if (!bot.enabled || !connection.enabled || connection.status !== "connected") return "missingConfig";
  if (runtime && !runtime.running) {
    return runtime.status === "error" || runtime.status === "degraded" ? "failed" : "missingConfig";
  }
  return "connected";
}

function resolveProject(workspaceRoot: string, projects: readonly Project[]) {
  const root = workspaceRoot.trim();
  if (!root) return undefined;
  return projects.find((project) => project.path === root)?.id;
}

function mappedSessionIDs(connection: BotConnectionView, sessions: readonly Session[]) {
  const mapped = new Set(connection.sessionMappings.map((mapping) => mapping.sessionId.trim()).filter(Boolean));
  for (const session of sessions) {
    if (session.channelId === connection.id) mapped.add(session.id);
  }
  return Array.from(mapped);
}

export function adaptBotChannels(
  bot: BotSettingsView,
  runtime: BotRuntimeStatusView | null | undefined,
  projects: readonly Project[],
  sessions: readonly Session[],
  diagnostics: readonly BotConnectionDiagnostic[] = [],
): Channel[] {
  const diagnosticByID = new Map(diagnostics.map((item) => [item.id, item]));
  return bot.connections.map((connection) => {
    const adapter = runtime?.adapters?.find((candidate) => candidate.id === connection.id);
    const users = uniqueTrimmed(connection.access.users);
    const groups = uniqueTrimmed(connection.access.groups);
    const sessionIds = mappedSessionIDs(connection, sessions);
    const remoteId = connection.sessionMappings.find((mapping) => mapping.remoteId.trim())?.remoteId.trim() ?? "";
    const diagnostic = diagnosticByID.get(connection.id);
    return {
      id: connection.id,
      provider: connection.provider,
      domain: connection.domain,
      type: channelType(connection),
      name: connection.label.trim() || channelType(connection),
      connState: connectionState(bot, connection, runtime, diagnostic),
      enabled: connection.enabled,
      hasAssociation: sessionIds.length > 0,
      remoteId,
      scope: connection.workspaceRoot.trim() || "全局",
      projectId: resolveProject(connection.workspaceRoot, projects),
      workspaceRoot: connection.workspaceRoot.trim(),
      policy: connection.access.allowAll ? "everyone" : "trusted",
      whitelistOn: connection.access.enabled,
      userHit: users.length > 0,
      users,
      groups,
      lastSync: adapter?.lastSyncAt || adapter?.startedAt || connection.updatedAt || runtime?.startedAt || "—",
      sessionIds,
      credentialSet: connection.credential.secretSet,
      credentialEnv: connection.credential.appSecretEnv.trim() || connection.credential.tokenEnv.trim(),
      lastError: adapter
        ? adapter.lastError.trim()
        : connection.lastError.trim() || diagnostic?.message || (runtime?.status === "error" ? runtime.message : ""),
    };
  });
}

function requireAvailableProject(projectId: string, projects: readonly Project[]) {
  if (!projectId) return null;
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project || project.status !== "ok") throw new Error("项目不可用，请选择一个当前可访问的项目");
  return project;
}

export function patchBotChannel(
  bot: BotSettingsView,
  id: string,
  patch: ChannelPatch,
  projects: readonly Project[],
): BotSettingsView {
  const index = bot.connections.findIndex((connection) => connection.id === id);
  if (index < 0) throw new Error("渠道不存在或已被删除");
  const selectedProject = patch.projectId === undefined ? undefined : requireAvailableProject(patch.projectId, projects);
  const connections = bot.connections.map((connection, connectionIndex) => {
    if (connectionIndex !== index) return connection;
    const users = patch.users === undefined ? connection.access.users : uniqueTrimmed(patch.users);
    const groups = patch.groups === undefined ? connection.access.groups : uniqueTrimmed(patch.groups);
    const allowAll = patch.policy === undefined ? connection.access.allowAll : patch.policy === "everyone";
    return {
      ...connection,
      label: patch.name === undefined ? connection.label : patch.name.trim(),
      enabled: patch.enabled ?? connection.enabled,
      workspaceRoot: patch.projectId === undefined ? connection.workspaceRoot : selectedProject?.path ?? "",
      access: {
        ...connection.access,
        enabled: patch.whitelistOn ?? connection.access.enabled,
        allowAll,
        users,
        groups,
      },
      updatedAt: new Date().toISOString(),
    };
  });
  return { ...bot, enabled: bot.enabled || patch.enabled === true, connections };
}
