// Run: tsx src/__tests__/rill-history-recycle.test.tsx

import { strict as assert } from "node:assert";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { filterHistorySessions } from "../rill/components/workbench/History";
import { filterRecycledSessions } from "../rill/components/workbench/Recycle";
import {
  StoreProvider,
  useStore,
  type Project,
  type Recycled,
  type RillSessionRuntime,
  type Session,
  type Store,
} from "../rill/state/visualStore";

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

const now = Date.now();
const projects: Project[] = [
  { id: "/repo/a", name: "项目 Alpha", path: "/repo/a", branch: "main", status: "ok", expanded: true },
  { id: "/repo/b", name: "项目 Beta", path: "/repo/b", branch: "main", status: "ok", expanded: true },
];

function session(id: string, patch: Partial<Session> = {}): Session {
  return {
    id,
    sessionPath: `/sessions/${id}.jsonl`,
    title: id,
    summary: `${id} summary`,
    projectId: "/repo/a",
    source: "local",
    runState: "idle",
    updatedAt: "刚刚",
    createdAt: "刚刚",
    activityAt: now,
    draft: "",
    attachments: [],
    refs: [],
    messages: [],
    settings: { model: "model", reasoning: "默认", exec: "自动", collab: "结对", permission: "需确认" },
    context: { used: 0, limit: 0, rounds: 0, roundTokens: 0, cacheHit: null, cacheMiss: null, roundCost: null, totalCost: null, currency: "USD", balance: null, refreshedAt: "刚刚" },
    ...patch,
  };
}

const searchable = [
  session("local-old", { title: "标题命中", activityAt: now - 40 * 86_400_000 }),
  session("bot-new", {
    projectId: "/repo/b",
    source: "bot",
    sourceDetail: "飞书/Lark",
    activityAt: now - 60_000,
    messages: [{ id: "m", type: "user", text: "消息正文关键词" }],
  }),
];

assert.deepEqual(
  filterHistorySessions(searchable, projects, { query: "项目 Beta", projectId: "all", source: "all", activity: "all", now }).map((item) => item.id),
  ["bot-new"],
  "history search covers project names",
);

assert.deepEqual(
  filterRecycledSessions([
    { id: "recent", title: "recent", summary: "", projectId: "/repo/a", source: "local", deletedAt: "刚刚", deletedAtMs: now - 60_000, snapshot: session("recent") },
    { id: "old", title: "old", summary: "", projectId: "/repo/a", source: "local", deletedAt: "40 天前", deletedAtMs: now - 40 * 86_400_000, snapshot: session("old") },
  ], "", "week", now).map((item) => item.id),
  ["recent"],
  "recycle deletion-time filtering uses the persisted deletion timestamp",
);
assert.deepEqual(
  filterHistorySessions(searchable, projects, { query: "/repo/b", projectId: "all", source: "all", activity: "all", now }).map((item) => item.id),
  ["bot-new"],
  "history search covers project paths",
);
assert.deepEqual(
  filterHistorySessions(searchable, projects, { query: "消息正文关键词", projectId: "/repo/b", source: "bot", activity: "day", now }).map((item) => item.id),
  ["bot-new"],
  "project, source, time and body search compose",
);

let backendHistory = [session("keep"), session("delete-ok"), session("delete-fail")];
let backendRecycle: Recycled[] = [];
const calls: string[] = [];
const runtime: RillSessionRuntime = {
  submit: async () => {},
  steer: async () => {},
  listHistory: async () => backendHistory,
  listRecycle: async () => backendRecycle,
  delete: async (target) => {
    calls.push(`delete:${target.id}`);
    if (target.id === "delete-fail") throw new Error("disk locked");
    backendHistory = backendHistory.filter((item) => item.id !== target.id);
    backendRecycle = [{ id: target.id, title: target.title, summary: target.summary, projectId: target.projectId, source: target.source, deletedAt: "刚刚", deletedAtMs: now, snapshot: target }, ...backendRecycle];
  },
  restore: async (target, targetProject) => {
    calls.push(`restore:${target.id}:${targetProject?.id ?? "original"}`);
    backendRecycle = backendRecycle.filter((item) => item.id !== target.id);
    backendHistory = [target.snapshot, ...backendHistory];
    return target.snapshot;
  },
  resume: async (target) => {
    calls.push(`resume:${target.id}`);
    return { ...target, id: `open-${target.id}`, runState: "idle" };
  },
  purge: async (target) => {
    calls.push(`purge:${target.id}`);
    if (target.id === "purge-fail") throw new Error("permission denied");
    backendRecycle = backendRecycle.filter((item) => item.id !== target.id);
  },
};

let store: Store | null = null;
function Probe() { store = useStore(); return null; }
function currentStore() { if (!store) throw new Error("store unavailable"); return store; }

const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(
    <StoreProvider seed={{ route: "history", projects, sessions: [session("open")], historySessions: backendHistory, recycled: backendRecycle, activeSessionId: "open" }} runtime={runtime}>
      <Probe />
    </StoreProvider>,
  );
});

await act(async () => { assert.equal(await currentStore().deleteSession("delete-fail"), false); });
assert.ok(currentStore().historySessions.some((item) => item.id === "delete-fail"), "failed deletion keeps the persisted history row");
assert.equal(currentStore().recycled.length, 0, "failed deletion does not invent a recycle row");

await act(async () => { assert.equal(await currentStore().deleteSession("delete-ok"), true); });
assert.ok(!currentStore().historySessions.some((item) => item.id === "delete-ok"), "successful deletion refreshes history from backend");
assert.ok(currentStore().recycled.some((item) => item.id === "delete-ok"), "successful deletion refreshes recycle from backend");

backendRecycle = [
  ...backendRecycle,
  { id: "purge-fail", title: "purge-fail", summary: "", projectId: "/repo/a", source: "local", deletedAt: "刚刚", deletedAtMs: now, snapshot: session("purge-fail") },
];
await act(async () => { await currentStore().refreshRecycle(); });
await act(async () => { assert.equal(await currentStore().permanentDelete("purge-fail"), false); });
assert.ok(currentStore().recycled.some((item) => item.id === "purge-fail"), "failed purge keeps the persisted recycle row");

await act(async () => { assert.equal(await currentStore().restoreFromRecycle("delete-ok", "stay"), true); });
assert.ok(currentStore().historySessions.some((item) => item.id === "delete-ok"), "restore refreshes history from backend");
assert.ok(!currentStore().recycled.some((item) => item.id === "delete-ok"), "restore refreshes recycle from backend");
assert.equal(currentStore().route, "history", "stay action does not navigate away from the current route seed");

backendRecycle = [
  { id: "restore-history", title: "restore-history", summary: "", projectId: "/repo/a", source: "local", deletedAt: "刚刚", deletedAtMs: now, snapshot: session("restore-history") },
  { id: "restore-open", title: "restore-open", summary: "", projectId: "/repo/a", source: "local", deletedAt: "刚刚", deletedAtMs: now, snapshot: session("restore-open") },
  { id: "restore-missing-project", title: "restore-missing-project", summary: "", projectId: "/repo/missing", source: "local", deletedAt: "刚刚", deletedAtMs: now, snapshot: session("restore-missing-project", { projectId: "/repo/missing" }) },
];
await act(async () => { await currentStore().refreshRecycle(); });
await act(async () => { assert.equal(await currentStore().restoreFromRecycle("restore-missing-project", "stay"), false); });
assert.ok(currentStore().recycled.some((item) => item.id === "restore-missing-project"), "a missing original project requires an explicit target and preserves the trash row");
await act(async () => { assert.equal(await currentStore().restoreFromRecycle("restore-missing-project", "history", "/repo/b"), true); });
assert.equal(currentStore().route, "history", "history restore action navigates to history after backend success");
assert.ok(calls.includes("restore:restore-missing-project:/repo/b"), "selected recovery project is passed to the backend");

await act(async () => { assert.equal(await currentStore().restoreFromRecycle("restore-open", "open"), true); });
assert.equal(currentStore().route, "workbench", "open restore action navigates to the workbench");
assert.equal(currentStore().activeSessionId, "open-restore-open", "open restore action activates the backend-resumed session");
assert.ok(calls.includes("resume:restore-open"), "open restore action resumes through the backend");

assert.ok(calls.includes("delete:delete-fail") && calls.includes("delete:delete-ok"), "history writes delegate to the runtime");
await act(async () => root.unmount());
process.stdout.write("rill history and recycle tests passed\n");
