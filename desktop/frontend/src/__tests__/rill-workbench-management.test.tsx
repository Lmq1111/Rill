// Run: tsx src/__tests__/rill-workbench-management.test.tsx

import { strict as assert } from "node:assert";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar, sessionsForProjectSearch } from "../rill/components/workbench/Sidebar";
import {
  StoreProvider,
  useStore,
  type Project,
  type RillSessionRuntime,
  type Session,
  type Store,
} from "../rill/state/visualStore";

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.Event = dom.window.Event;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

const projects: Project[] = [
  { id: "/repo/a", name: "动态项目 Alpha", path: "/repo/a", branch: "main", status: "ok", expanded: true },
  { id: "/repo/b", name: "动态项目 Beta", path: "/repo/b", branch: "main", status: "ok", expanded: true },
];
const baseSession: Session = {
  id: "tab-a",
  topicId: "topic-a",
  sessionPath: "/sessions/a.jsonl",
  title: "真实会话 A",
  summary: "Alpha 会话摘要",
  projectId: "/repo/a",
  source: "local",
  runState: "idle",
  updatedAt: "刚刚",
  createdAt: "刚刚",
  draft: "",
  attachments: [],
  refs: [],
  messages: [],
  settings: { model: "test/model", reasoning: "默认", exec: "自动", collab: "结对", permission: "需确认" },
  context: { used: 0, limit: 0, rounds: 0, roundTokens: 0, cacheHit: null, cacheMiss: null, roundCost: null, totalCost: null, currency: "USD", balance: null, refreshedAt: "刚刚" },
};
const sessions: Session[] = [
  baseSession,
  { ...baseSession, id: "tab-b", topicId: "topic-b", sessionPath: "/sessions/b.jsonl", title: "真实会话 B", summary: "Beta 会话摘要", projectId: "/repo/b" },
];

let store: Store | null = null;
function Probe() {
  store = useStore();
  return null;
}
function currentStore() {
  if (!store) throw new Error("store not ready");
  return store;
}

const calls: string[] = [];
const runtime: RillSessionRuntime = {
  submit: async () => {},
  steer: async () => {},
  createIsolated: async (project) => {
    calls.push(`isolate:${project.id}`);
    const isolatedProject: Project = { id: "/managed/a", name: "动态项目 Alpha·隔离", path: "/managed/a", branch: "rill/delivery-a", status: "ok", expanded: true, isolated: { from: project.id } };
    return { project: isolatedProject, session: { ...baseSession, id: "tab-isolated", topicId: "topic-isolated", projectId: isolatedProject.id, title: "隔离会话" } };
  },
  rename: async (session, title) => { calls.push(`rename:${session.topicId}:${title}`); },
  close: async (session) => { calls.push(`close:${session.id}`); },
};

const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(
    <StoreProvider seed={{ projects, sessions, activeSessionId: "tab-a" }} runtime={runtime}>
      <Sidebar />
      <Probe />
    </StoreProvider>,
  );
});

await act(async () => {
  await currentStore().createIsolatedWorkspace("/repo/a");
});
assert.ok(calls.includes("isolate:/repo/a"), "isolation delegates to the live backend");
assert.equal(currentStore().activeSessionId, "tab-isolated", "the backend-created isolated session becomes active");
assert.ok(currentStore().projects.some((project) => project.id === "/managed/a" && project.isolated), "the real isolated project result is visible");

await act(async () => {
  await currentStore().renameSession("tab-isolated", "隔离验收会话");
});
assert.ok(calls.includes("rename:topic-isolated:隔离验收会话"), "rename delegates with the real topic identity");
assert.equal(currentStore().sessions.find((session) => session.id === "tab-isolated")?.title, "隔离验收会话");

await act(async () => {
  await currentStore().closeSession("tab-isolated");
});
assert.ok(calls.includes("close:tab-isolated"), "close delegates with the real tab identity");
assert.ok(!currentStore().sessions.some((session) => session.id === "tab-isolated"), "a successfully closed tab leaves the open-session list");

assert.deepEqual(
  projects.map((project) => sessionsForProjectSearch(project, sessions, "动态项目 Beta").map((session) => session.id)),
  [[], ["tab-b"]],
  "project-name search keeps every session under the matching project and hides non-matching projects",
);

await act(async () => root.unmount());
process.stdout.write("rill workbench management tests passed\n");
