import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { app, onProjectTreeChanged, onReady, onRuntimeRebuilt } from "../lib/bridge";
import type { BotRuntimeStatusView, BotSettingsView, ProjectNode, TabMeta } from "../lib/types";
import { useController } from "../lib/useController";
import { adaptHistorySession, adaptLiveProjects, adaptLiveSession, adaptTrashedSession } from "./adapters/live";
import { adaptBotChannels, patchBotChannel } from "./adapters/channels";
import { adaptFilePreview, adaptWorkspaceChanges, attachWorkspaceDiff, buildRillSubmitText } from "./adapters/workspace";
import { CorePages } from "./pages/core";
import {
  StoreProvider,
  useStore,
  type RillSessionRuntime,
  type Route,
  type VisualStoreSeed,
} from "./state/visualStore";

const MAX_WORKSPACE_FILES = 2000;

async function listWorkspaceFiles(tabId: string) {
  const files: import("./state/visualStore").FileNode[] = [];
  const directories = [""];
  while (directories.length > 0 && files.length < MAX_WORKSPACE_FILES) {
    const directory = directories.shift()!;
    const entries = await app.ListDirForTab(tabId, directory);
    for (const entry of entries) {
      const path = entry.path || `${directory}${entry.name}`;
      if (entry.isDir) {
        if (directories.length + files.length < MAX_WORKSPACE_FILES) directories.push(path.endsWith("/") ? path : `${path}/`);
      } else {
        files.push({ path, name: entry.displayName || entry.name, type: "file", kind: "text" });
      }
      if (files.length >= MAX_WORKSPACE_FILES) break;
    }
  }
  return files;
}

function RillRouteOutlet() {
  const { route } = useStore();
  const key = route === "settings" ? "settings-general" : route;
  const Page = CorePages[key as keyof typeof CorePages] ?? CorePages.workbench;
  return <Page />;
}

export function RillLiveApp() {
  const controller = useController();
  const [tabs, setTabs] = useState<TabMeta[]>([]);
  const [tree, setTree] = useState<ProjectNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [modelAvailability, setModelAvailability] = useState<Record<string, boolean>>({});
  const [botSettings, setBotSettings] = useState<BotSettingsView | null>(null);
  const [botRuntimeStatus, setBotRuntimeStatus] = useState<BotRuntimeStatusView | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextTabs, nextTree, nextSettings, nextRuntime] = await Promise.all([
        app.ListTabs(),
        app.ListProjectTree(),
        app.Settings().catch(() => null),
        app.BotRuntimeStatus().catch(() => null),
      ]);
      setTabs(Array.isArray(nextTabs) ? nextTabs : []);
      setTree(Array.isArray(nextTree) ? nextTree : []);
      if (nextSettings) setBotSettings(nextSettings.bot);
      if (nextRuntime) setBotRuntimeStatus(nextRuntime);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "无法读取工作区");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 2000);
    const unsubProject = onProjectTreeChanged(() => void refresh());
    const unsubReady = onReady(() => void refresh());
    const unsubRebuilt = onRuntimeRebuilt(() => void refresh());
    return () => {
      window.clearInterval(interval);
      unsubProject();
      unsubReady();
      unsubRebuilt();
    };
  }, [refresh]);

  const activeTabId = controller.activeTabId ?? tabs.find((tab) => tab.active)?.id;
  useEffect(() => {
    if (!activeTabId) return;
    let live = true;
    void app.ModelsForTab(activeTabId).then((models) => {
      if (live) setModelAvailability((current) => ({ ...current, [activeTabId]: Array.isArray(models) && models.length > 0 }));
    }).catch(() => {});
    return () => { live = false; };
  }, [activeTabId]);
  const projects = useMemo(() => adaptLiveProjects(tree, tabs), [tabs, tree]);
  const sessions = useMemo(() => tabs
    .filter((tab) => tab.tabType !== "file")
    .map((tab) => adaptLiveSession(tab, tab.id === controller.activeTabId ? {
      items: controller.state.items,
      running: controller.state.running,
      hydrating: controller.state.hydrating,
      approval: controller.state.approval,
      ask: controller.state.ask,
      context: controller.state.context,
      meta: controller.state.meta,
      modelsAvailable: modelAvailability[tab.id],
    } : undefined)), [controller.activeTabId, controller.state, tabs]);
  const channels = useMemo(
    () => botSettings ? adaptBotChannels(botSettings, botRuntimeStatus, projects, sessions) : [],
    [botRuntimeStatus, botSettings, projects, sessions],
  );

  const loadLiveChannels = useCallback(async () => {
    const [settings, status] = await Promise.all([app.Settings(), app.BotRuntimeStatus()]);
    setBotSettings(settings.bot);
    setBotRuntimeStatus(status);
    return adaptBotChannels(settings.bot, status, projects, sessions);
  }, [projects, sessions]);

  const seed = useMemo<VisualStoreSeed>(() => ({
    route: "workbench" as Route,
    projects,
    sessions,
    channels,
    activeSessionId: activeTabId,
  }), [activeTabId, channels, projects, sessions]);

  const runtime = useMemo<RillSessionRuntime>(() => ({
    submit: async (session, input) => {
      await controller.sendToTab(session.id, input, buildRillSubmitText(session, input));
    },
    steer: async (session, input) => {
      await controller.steerForTab(session.id, input);
    },
    activate: async (session) => {
      const tab = tabs.find((candidate) => candidate.id === session.id);
      if (!tab) throw new Error("会话已不可用");
      const nextTabs = await controller.switchTab(tab.id, tab);
      if (nextTabs) setTabs(nextTabs);
    },
    create: async (projectId) => {
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project || project.status !== "ok") throw new Error("当前项目不可用");
      const scope = projectId === "global" ? "global" : "project";
      const tab = await controller.ensureBlankTab(scope, scope === "global" ? "" : project.path);
      setTabs((current) => [...current.filter((candidate) => candidate.id !== tab.id), tab]);
      void refresh();
      return adaptLiveSession(tab, {
        items: [],
        running: false,
        hydrating: false,
        context: { used: 0, window: 0, sessionTokens: 0 },
        meta: controller.state.meta,
      });
    },
    addProject: async (project, create) => {
      const workspaceRoot = create ? await app.CreateWorkspace(project.path) : await app.SwitchWorkspace(project.path);
      if (!workspaceRoot) throw new Error("未选择可用的项目目录");
      if (project.name.trim()) await app.RenameProject(workspaceRoot, project.name.trim());
      const tab = await controller.ensureBlankTab("project", workspaceRoot);
      const [nextTabs, nextTree] = await Promise.all([app.ListTabs(), app.ListProjectTree()]);
      setTabs(nextTabs);
      setTree(nextTree);
      const createdProject = adaptLiveProjects(nextTree, nextTabs).find((candidate) => candidate.id === workspaceRoot);
      if (!createdProject) throw new Error("项目已注册，但无法从项目树读取结果");
      return {
        project: createdProject,
        session: adaptLiveSession(tab, {
          items: [],
          running: false,
          hydrating: false,
          context: { used: 0, window: 0, sessionTokens: 0 },
          meta: controller.state.meta,
        }),
      };
    },
    createIsolated: async (project) => {
      const result = await controller.createDeliveryWorktree(project.path);
      const nextProject = {
        id: result.workspaceRoot,
        name: `${project.name}·隔离`,
        path: result.workspaceRoot,
        branch: result.branch,
        status: "ok" as const,
        expanded: true,
        isolated: { from: project.id },
      };
      setTabs((current) => [...current.filter((candidate) => candidate.id !== result.tab.id), result.tab]);
      void refresh();
      return {
        project: nextProject,
        session: adaptLiveSession(result.tab, {
          items: [],
          running: false,
          hydrating: false,
          context: { used: 0, window: 0, sessionTokens: 0 },
          meta: controller.state.meta,
        }),
      };
    },
    rename: async (session, title) => {
      if (session.sessionPath && session.id === session.sessionPath) {
        await app.RenameSession(session.sessionPath, title);
        return;
      }
      if (!session.topicId) throw new Error("会话主题标识不可用");
      await app.RenameTopic(session.topicId, title);
      await refresh();
    },
    close: async (session) => {
      await app.CloseTab(session.id);
      await controller.syncActiveTab(false);
      await refresh();
    },
    listHistory: async () => {
      const entries = await app.ListAllSessions();
      return Promise.all((entries ?? []).map(async (entry) => {
        const history = await app.PreviewSession(entry.path).catch(() => []);
        return adaptHistorySession(entry, history);
      }));
    },
    listRecycle: async () => {
      const entries = await app.ListTrashedSessions();
      return Promise.all((entries ?? []).map(async (entry) => {
        const history = await app.PreviewTrashedSession(entry.path).catch(() => []);
        return adaptTrashedSession(entry, history);
      }));
    },
    resume: async (session) => {
      if (!session.sessionPath) throw new Error("历史会话路径不可用");
      const alreadyOpen = tabs.find((tab) => tab.sessionPath === session.sessionPath);
      if (alreadyOpen) {
        const nextTabs = await controller.switchTab(alreadyOpen.id, alreadyOpen);
        if (nextTabs) setTabs(nextTabs);
        return adaptLiveSession(alreadyOpen);
      }
      const scope = session.projectId === "global" ? "global" : "project";
      const project = projects.find((candidate) => candidate.id === session.projectId && candidate.status === "ok");
      if (scope === "project" && !project) throw new Error("历史会话所属项目不可用");
      const tab = await controller.ensureBlankTab(scope, scope === "project" ? project!.path : "");
      await controller.resumeSession(session.sessionPath, tab.id);
      const nextTabs = await app.ListTabs();
      const resumed = nextTabs.find((candidate) => candidate.id === tab.id);
      if (!resumed || resumed.sessionPath !== session.sessionPath) throw new Error("后端未能恢复该历史会话");
      setTabs(nextTabs);
      return adaptLiveSession(resumed);
    },
    delete: async (session) => {
      if (!session.sessionPath) throw new Error("会话路径不可用");
      await app.DeleteSession(session.sessionPath);
      await refresh();
    },
    restore: async (entry, targetProject) => {
      if (!entry.snapshot.sessionPath) throw new Error("回收站会话路径不可用");
      if (targetProject && entry.projectId !== "global" && targetProject.id !== entry.projectId) await app.RestoreSessionToProject(entry.snapshot.sessionPath, targetProject.path);
      else await app.RestoreSession(entry.snapshot.sessionPath);
      const entries = await app.ListAllSessions();
      const basename = entry.snapshot.sessionPath.split(/[\\/]/).pop();
      const restored = entries.find((candidate) =>
        (entry.snapshot.topicId && candidate.topicId === entry.snapshot.topicId) || candidate.path.split(/[\\/]/).pop() === basename,
      );
      if (!restored) throw new Error("会话已恢复，但无法读取恢复结果");
      return adaptHistorySession(restored, await app.PreviewSession(restored.path));
    },
    purge: async (entry) => {
      if (!entry.snapshot.sessionPath) throw new Error("回收站会话路径不可用");
      await app.PurgeTrashedSession(entry.snapshot.sessionPath);
    },
    purgeRecovery: async (entry) => {
      if (!entry.snapshot.sessionPath) throw new Error("恢复副本路径不可用");
      await app.PurgeRecoveryCopy(entry.snapshot.sessionPath);
    },
    commands: async () => app.Commands(),
    edit: async (session, message, next) => {
      if (message.checkpointTurn == null) throw new Error("该消息没有可回滚检查点");
      const original = (message.submitText ?? message.text ?? "").trim();
      const rewound = await controller.rewindForTab(session.id, message.checkpointTurn, "conversation");
      if (!rewound) throw new Error("无法回滚到该消息节点");
      await controller.sendToTab(session.id, next, next, original);
    },
    rewind: async (session, message) => {
      if (message.checkpointTurn == null) throw new Error("该消息没有可回滚检查点");
      const rewound = await controller.rewindForTab(session.id, message.checkpointTurn, "conversation");
      if (!rewound) throw new Error("无法回滚到该消息节点");
    },
    cancel: async (session) => {
      await app.CancelTab(session.id);
      await refresh();
    },
    approve: async (_session, allow) => {
      const approval = controller.state.approval;
      if (!approval) throw new Error("确认请求已失效");
      controller.approve(approval.id, allow, false, false);
    },
    answer: async (_session, answer) => {
      const ask = controller.state.ask;
      const question = ask?.questions[0];
      if (!ask || !question) throw new Error("提问请求已失效");
      controller.answerQuestion(ask.id, [{ questionId: question.id, selected: [answer] }]);
    },
    clearContext: async (session) => {
      await app.ClearModelContextForTab(session.id);
    },
    listFiles: async (session) => listWorkspaceFiles(session.id),
    readFile: async (session, path) => adaptFilePreview(await app.ReadFileForTab(session.id, path)),
    listDiffs: async (session) => {
      const view = await app.WorkspaceChanges(session.id);
      if (!view.gitAvailable) throw new Error(view.gitErr || "当前工作区不是 Git 仓库");
      return adaptWorkspaceChanges(view);
    },
    readDiff: async (session, file) => attachWorkspaceDiff(file, await app.WorkspaceFileDiff(session.id, file.path)),
    listChannels: loadLiveChannels,
    saveChannel: async (channel, channelPatch) => {
      const settings = await app.Settings();
      const nextBot = patchBotChannel(settings.bot, channel.id, channelPatch, projects);
      await app.SetBotSettings(nextBot);
      return loadLiveChannels();
    },
    saveChannelSecret: async (channel, secret) => {
      const envName = channel.credentialEnv?.trim() ?? "";
      if (!envName) throw new Error("该渠道没有可用的凭证存储引用");
      await app.SetBotSecret(envName, secret);
      return loadLiveChannels();
    },
    reconnectChannel: async (channel) => {
      const settings = await app.Settings();
      const nextBot = patchBotChannel(settings.bot, channel.id, { enabled: true }, projects);
      await app.SetBotSettings({ ...nextBot, enabled: true });
      let latest = await loadLiveChannels();
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const current = latest.find((candidate) => candidate.id === channel.id);
        if (current?.connState === "connected") return latest;
        if (current?.connState === "failed" && current.lastError) throw new Error(current.lastError);
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        latest = await loadLiveChannels();
      }
      const current = latest.find((candidate) => candidate.id === channel.id);
      throw new Error(current?.lastError || "Bot 运行时未能恢复连接");
    },
    refreshContext: async (session) => {
      const context = await app.ContextUsageForTab(session.id);
      return {
        ...session.context,
        used: context.used,
        limit: context.window,
        cacheHit: context.cacheHitTokens ?? null,
        cacheMiss: context.cacheMissTokens ?? null,
        totalCost: context.sessionCost ?? null,
        currency: context.sessionCurrency ?? session.context.currency,
        refreshedAt: "刚刚",
      };
    },
  }), [controller, loadLiveChannels, projects, refresh, tabs]);

  if (!loaded) {
    return (
      <div className="rill-app" data-testid="rill-live-shell">
        <div className="grid h-screen place-items-center bg-slate-50 text-[13px] text-slate-500">正在加载工作区…</div>
      </div>
    );
  }

  if (loadError && sessions.length === 0) {
    return (
      <div className="rill-app" data-testid="rill-live-shell">
        <div className="grid h-screen place-items-center bg-slate-50 px-6 text-center text-[13px] text-rose-600">
          工作区加载失败：{loadError}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    const project = projects.find((candidate) => candidate.status === "ok");
    return (
      <div className="rill-app" data-testid="rill-live-shell">
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center text-[13px] text-slate-500">
          <div>暂无可用会话。</div>
          {project ? (
            <button
              className="rounded-lg bg-teal-600 px-3.5 py-2 text-white hover:bg-teal-700"
              onClick={() => void runtime.create?.(project.id)}
            >
              在「{project.name}」中创建会话
            </button>
          ) : <div className="text-rose-600">请先添加一个可用项目。</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="rill-app" data-testid="rill-live-shell">
      <StoreProvider seed={seed} runtime={runtime}>
        <RillRouteOutlet />
        <Toaster position="bottom-right" richColors />
      </StoreProvider>
    </div>
  );
}
