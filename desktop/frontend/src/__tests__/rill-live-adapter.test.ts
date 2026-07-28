// Run: tsx src/__tests__/rill-live-adapter.test.ts

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { adaptLiveProjects, adaptLiveSession } from "../rill/adapters/live";
import { adaptFilePreview, adaptWorkspaceChanges, attachWorkspaceDiff, buildRillSubmitText } from "../rill/adapters/workspace";
import { RillLiveApp } from "../rill/RillLiveApp";
import type { ProjectNode, TabMeta } from "../lib/types";
import {
  StoreProvider,
  useStore,
  type Project,
  type RillSessionRuntime,
  type Session,
  type Store,
} from "../rill/state/visualStore";

const tree: ProjectNode[] = [
  { key: "project-a", kind: "project", label: "动态项目 A", root: "/repo/a", children: [] },
  { key: "global", kind: "global_folder", label: "全局", root: "", children: [] },
];

const projects = adaptLiveProjects(tree, []);
assert.deepEqual(projects.map((project) => [project.id, project.name]), [["/repo/a", "动态项目 A"], ["global", "全局"]]);

const tab: TabMeta = {
  id: "tab-a",
  scope: "project",
  workspaceRoot: "/repo/a",
  workspaceName: "a",
  topicId: "topic-a",
  topicTitle: "真实会话",
  label: "model-a",
  ready: true,
  running: true,
  pendingPrompt: true,
  active: true,
  cwd: "/repo/a",
  mode: "normal",
};

const session = adaptLiveSession(tab, {
  items: [
    { kind: "user", id: "u1", text: "真实问题" },
    { kind: "assistant", id: "a1", text: "真实回答", reasoning: "", streaming: true },
  ],
  running: true,
  hydrating: false,
  approval: { id: "approval-1", tool: "run_shell", subject: "git status", reason: "需要确认" },
  context: { used: 1200, window: 200000, sessionTokens: 1800, cacheHitTokens: 700, cacheMissTokens: 500, modelContextCleared: true, modelContextStart: 3 },
  meta: { label: "model-a", ready: true, eventChannel: "events", cwd: "/repo/a", workspaceRoot: "/repo/a", gitBranch: "main" },
});

assert.equal(session.projectId, "/repo/a");
assert.equal(session.runState, "awaitingConfirm");
assert.deepEqual(session.messages.map((message) => [message.type, message.text]), [["user", "真实问题"], ["ai", "真实回答"]]);
assert.equal(session.context.used, 1200);
assert.equal(session.context.rounds, 1);
assert.equal(session.modelContextClearedAt, "已清空");
assert.equal(session.pendingConfirm?.command, "git status");

const preview = adaptFilePreview({ path: "src/live.ts", body: "line 1\nline 2", size: 13, truncated: false, binary: false });
assert.equal(preview.content, "line 1\nline 2");
assert.equal(preview.kind, "text");
const changes = adaptWorkspaceChanges({
  gitAvailable: true,
  gitBranch: "main",
  files: [{ path: "src/live.ts", sources: ["git"], gitStatus: "M" }],
});
assert.equal(changes[0]?.status, "modified");
const changed = attachWorkspaceDiff(changes[0]!, {
  path: "src/live.ts",
  diff: "@@ -1 +1 @@\n-line 1\n+line one",
  added: 1,
  removed: 1,
  binary: false,
  truncated: false,
});
assert.deepEqual(changed.hunks?.[0]?.lines.map((line) => [line.kind, line.t]), [["ctx", "@@ -1 +1 @@"], ["del", "-line 1"], ["add", "+line one"]]);
const referencedSession = { ...session, refs: [{ id: "ref-live", kind: "snippet" as const, label: "src/live.ts:1-2", detail: "路径：src/live.ts\n行号：1-2\n\nline 1\nline 2" }] };
const submitWithReference = buildRillSubmitText(referencedSession, "检查这段代码");
assert.match(submitWithReference, /src\/live\.ts:1-2/);
assert.match(submitWithReference, /line 1\nline 2/);

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

const liveProjects: Project[] = [
  { id: "/repo/a", name: "动态项目 A", path: "/repo/a", branch: "main", status: "ok", expanded: true },
];
const liveSession = (id: string, title: string): Session => ({
  ...session,
  id,
  title,
  projectId: "/repo/a",
  runState: "idle",
  draft: "",
  messages: [],
});
let store: Store | null = null;
function Probe() {
  store = useStore();
  return null;
}
function currentStore(): Store {
  if (!store) throw new Error("store probe has not rendered");
  return store;
}

const runtimeCalls: string[] = [];
const runtime: RillSessionRuntime = {
  submit: async () => {},
  steer: async () => {},
  activate: async (target) => { runtimeCalls.push(`activate:${target.id}`); },
  create: async (projectId) => {
    runtimeCalls.push(`create:${projectId}`);
    return liveSession("live-created", "真实新会话");
  },
  cancel: async (target) => { runtimeCalls.push(`cancel:${target.id}`); },
  approve: async (target, allow) => { runtimeCalls.push(`approve:${target.id}:${allow}`); },
  answer: async (target, answer) => { runtimeCalls.push(`answer:${target.id}:${answer}`); },
  clearContext: async (target) => { runtimeCalls.push(`clear-context:${target.id}`); },
};

const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(createElement(StoreProvider, {
    seed: { projects: liveProjects, sessions: [liveSession("live-a", "真实会话 A")], activeSessionId: "live-a" },
    runtime,
    children: createElement(Probe),
  }));
});
assert.deepEqual(currentStore().projects.map((project) => project.id), ["/repo/a"]);
assert.deepEqual(currentStore().sessions.map((candidate) => candidate.id), ["live-a"]);

await act(async () => {
  root.render(createElement(StoreProvider, {
    seed: {
      projects: liveProjects,
      sessions: [liveSession("live-a", "真实会话 A"), liveSession("live-b", "真实会话 B")],
      activeSessionId: "live-b",
    },
    runtime,
    children: createElement(Probe),
  }));
});
assert.equal(currentStore().activeSessionId, "live-b");
assert.equal(currentStore().active.title, "真实会话 B");

await act(async () => {
  currentStore().setActiveSession("live-a");
  await Promise.resolve();
});
assert.equal(runtimeCalls[runtimeCalls.length - 1], "activate:live-a");

await act(async () => {
  currentStore().updateSession("live-a", {
    pendingConfirm: { op: "执行命令", command: "git status", scope: "动态项目 A", workdir: "/repo/a", risk: "需要确认" },
    pendingQuestion: { q: "继续吗？", options: ["继续", "停止"] },
  });
});
await act(async () => {
  currentStore().resolveConfirm("live-a", true);
  currentStore().answerQuestion("live-a", "继续");
  await Promise.resolve();
});
assert.ok(runtimeCalls.includes("approve:live-a:true"));
assert.ok(runtimeCalls.includes("answer:live-a:继续"));

await act(async () => {
  currentStore().clearContext("live-a");
  await Promise.resolve();
});
assert.ok(runtimeCalls.includes("clear-context:live-a"));
assert.equal(currentStore().sessions.find((candidate) => candidate.id === "live-a")?.messages.length, 0);
assert.ok(currentStore().sessions.find((candidate) => candidate.id === "live-a")?.modelContextClearedAt);

await act(async () => {
  await currentStore().createSession("/repo/a");
});
assert.equal(runtimeCalls[runtimeCalls.length - 1], "create:/repo/a");
assert.equal(currentStore().activeSessionId, "live-created");

await act(async () => {
  currentStore().stopRun("live-created");
  await Promise.resolve();
});
assert.equal(runtimeCalls[runtimeCalls.length - 1], "cancel:live-created");

await act(async () => root.unmount());

const liveRoot = createRoot(document.getElementById("root")!);
await act(async () => {
  liveRoot.render(createElement(RillLiveApp));
  await new Promise((resolve) => setTimeout(resolve, 20));
});
assert.ok(document.querySelector('[data-testid="rill-live-shell"]'));
await act(async () => liveRoot.unmount());

const mainSource = readFileSync(new URL("../main.tsx", import.meta.url), "utf8");
assert.match(mainSource, /RillLiveApp/);
assert.doesNotMatch(mainSource, /<App\s*\/>/);

process.stdout.write("rill live adapter tests passed\n");
