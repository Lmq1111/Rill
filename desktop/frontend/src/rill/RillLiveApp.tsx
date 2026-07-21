import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { app, onProjectTreeChanged, onReady, onRuntimeRebuilt } from "../lib/bridge";
import type { ProjectNode, TabMeta } from "../lib/types";
import { useController } from "../lib/useController";
import { adaptLiveProjects, adaptLiveSession } from "./adapters/live";
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

  const refresh = useCallback(async () => {
    try {
      const [nextTabs, nextTree] = await Promise.all([app.ListTabs(), app.ListProjectTree()]);
      setTabs(Array.isArray(nextTabs) ? nextTabs : []);
      setTree(Array.isArray(nextTree) ? nextTree : []);
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
    } : undefined)), [controller.activeTabId, controller.state, tabs]);

  const seed = useMemo<VisualStoreSeed>(() => ({
    route: "workbench" as Route,
    projects,
    sessions,
    activeSessionId: activeTabId,
  }), [activeTabId, projects, sessions]);

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
      if (!session.topicId) throw new Error("会话主题标识不可用");
      await app.RenameTopic(session.topicId, title);
      await refresh();
    },
    close: async (session) => {
      await app.CloseTab(session.id);
      await controller.syncActiveTab(false);
      await refresh();
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
  }), [controller, projects, refresh, tabs]);

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
