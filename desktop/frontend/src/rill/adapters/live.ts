import type { Item } from "../../lib/useController";
import type { ContextInfo, Meta, ProjectNode, TabMeta, WireApproval, WireAsk } from "../../lib/types";
import type { Message, Project, RunState, Session } from "../state/visualStore";
import type { RillDisplayAdapter } from "./types";

export interface RillLiveControllerSnapshot {
  readonly items: readonly Item[];
  readonly running: boolean;
  readonly hydrating: boolean;
  readonly approval?: WireApproval;
  readonly ask?: WireAsk;
  readonly context: ContextInfo;
  readonly meta?: Meta;
}

export function adaptLiveProjects(tree: readonly ProjectNode[], tabs: readonly TabMeta[]): Project[] {
  return tree
    .filter((node) => node.kind === "project" || node.kind === "global_folder")
    .map((node) => {
      const global = node.kind === "global_folder";
      const id = global ? "global" : node.root?.trim() ?? "";
      const tab = tabs.find((candidate) => global ? candidate.scope === "global" : candidate.workspaceRoot === id);
      return {
        id,
        name: node.label || (global ? "全局" : "项目不可用"),
        path: global ? "" : id,
        branch: tab?.gitBranch ?? "",
        status: id || global ? "ok" : "unavailable",
        expanded: true,
        isolated: node.isolatedWorktree ? { from: id } : undefined,
      } satisfies Project;
    });
}

function adaptRunState(tab: TabMeta, snapshot?: RillLiveControllerSnapshot): RunState {
  if (tab.readOnly) return "readonly";
  if (tab.startupErr || snapshot?.meta?.startupErr) return "startFailed";
  if (!tab.ready || snapshot?.hydrating) return "loading";
  if (snapshot?.approval) return "awaitingConfirm";
  if (snapshot?.ask) return "awaitingAnswer";
  if (snapshot?.running || tab.running) return "aiRunning";
  return "idle";
}

function adaptMessage(item: Item): Message | null {
  switch (item.kind) {
    case "user":
      return { id: item.id, type: "user", text: item.text };
    case "assistant":
      return { id: item.id, type: "ai", text: item.text, thought: item.reasoning || undefined };
    case "notice":
      return { id: item.id, type: item.level === "warn" ? "error" : "notice", text: item.text, tone: item.level === "warn" ? undefined : "bg-slate-100 text-slate-500" };
    case "phase":
      return { id: item.id, type: "notice", text: item.text, tone: "bg-cyan-50 text-cyan-600" };
    case "compaction":
      return { id: item.id, type: "compress", text: item.pending ? "正在压缩上下文" : item.summary || "上下文已压缩" };
    case "tool":
      return {
        id: item.id,
        type: "tool",
        tool: item.name,
        cmd: item.args,
        ok: item.status === "done",
        out: item.output ?? item.error,
      };
  }
}

export function adaptLiveSession(tab: TabMeta, snapshot?: RillLiveControllerSnapshot): Session {
  const messages = snapshot?.items.map(adaptMessage).filter((message): message is Message => Boolean(message)) ?? [];
  const lastText = [...messages].reverse().find((message) => message.text?.trim())?.text?.trim();
  const context = snapshot?.context;
  const approval = snapshot?.approval;
  const question = snapshot?.ask?.questions[0];
  const collaboration = snapshot?.meta?.collaborationMode ?? tab.collaborationMode ?? "normal";
  const permission = snapshot?.meta?.toolApprovalMode ?? tab.toolApprovalMode ?? "ask";

  return {
    id: tab.id,
    title: tab.topicTitle || tab.label || "新会话",
    summary: lastText || "空会话，尚未开始对话。",
    projectId: tab.scope === "global" ? "global" : tab.workspaceRoot,
    source: "local",
    runState: adaptRunState(tab, snapshot),
    updatedAt: "刚刚",
    createdAt: "—",
    draft: "",
    attachments: [],
    refs: [],
    messages,
    settings: {
      model: snapshot?.meta?.label ?? tab.label,
      reasoning: "默认",
      exec: "自动",
      collab: collaboration === "plan" ? "监督" : collaboration === "goal" ? "自动" : "结对",
      permission: permission === "yolo" ? "自动" : permission === "auto" ? "按风险确认" : "需确认",
    },
    context: {
      used: context?.used ?? 0,
      limit: context?.window ?? 0,
      rounds: messages.filter((message) => message.type === "user").length,
      roundTokens: 0,
      cacheHit: context?.cacheHitTokens ?? null,
      cacheMiss: context?.cacheMissTokens ?? null,
      roundCost: null,
      totalCost: context?.sessionCost ?? null,
      currency: context?.sessionCurrency ?? "USD",
      balance: null,
      refreshedAt: "刚刚",
    },
    pendingConfirm: approval ? {
      op: approval.tool,
      command: approval.subject,
      scope: tab.workspaceName || tab.workspaceRoot,
      workdir: tab.cwd,
      risk: approval.reason ?? "该操作需要你的确认。",
    } : undefined,
    pendingQuestion: question ? {
      q: question.prompt,
      options: question.options.map((option) => option.label),
    } : undefined,
    error: tab.startupErr || snapshot?.meta?.startupErr,
  };
}

export const liveRillAdapter = Object.freeze({
  kind: "live",
  request: { page: "workbench", state: "default" },
} as const) satisfies RillDisplayAdapter;
