// Run: tsx src/__tests__/rill-automation.test.tsx

import { strict as assert } from "node:assert";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { HeartbeatTask } from "../custom/features/heartbeat/heartbeat.types";
import { adaptHeartbeatTasks, toHeartbeatTask } from "../rill/adapters/automation";
import {
  StoreProvider,
  useStore,
  type AutomationTask,
  type Channel,
  type Project,
  type RillSessionRuntime,
  type Store,
} from "../rill/state/visualStore";

const projects: Project[] = [
  { id: "/repo/a", name: "真实项目 A", path: "/repo/a", branch: "main", status: "ok", expanded: true },
  { id: "/repo/missing", name: "不可用项目", path: "/repo/missing", branch: "main", status: "unavailable", expanded: true },
];
const channels: Channel[] = [{
  id: "feishu-main", type: "飞书/Lark", name: "研发群", connState: "connected", hasAssociation: true,
  remoteId: "oc_stage6", scope: "全局", policy: "trusted", whitelistOn: true, userHit: true,
  users: [], groups: [], lastSync: "刚刚", sessionIds: [],
}];
const backendTasks: HeartbeatTask[] = [{
  id: "monthly-31",
  title: "月末巡检",
  prompt: "检查月末状态",
  interval: "720h|monthly:31@08:30",
  enabled: true,
  scope: "project",
  workspaceRoot: "/repo/a",
  approvalMode: "auto",
  newConversationEachRun: false,
  notifyChannels: true,
  notifyChannelIds: ["feishu-main"],
  timeZone: "Asia/Shanghai",
  lastRunStatus: "success",
}];

const [adapted] = adaptHeartbeatTasks(backendTasks, projects, [], channels);
assert.equal(adapted.scope, "/repo/a", "workspace root resolves to the live project id");
assert.equal(adapted.monthday, "31", "monthly dates retain the full 1-31 range");
assert.equal(adapted.time, "08:30", "scheduled clock time is decoded from the persisted interval");
assert.equal(adapted.tz, "UTC+8 (Asia/Shanghai)", "the persisted IANA zone is exposed in Rill language");
assert.equal(adapted.permission, "Auto", "approval mode remains backend-authoritative");
assert.equal(adapted.pushChannelId, "feishu-main", "the selected channel is restored from persisted ids");
assert.equal(adapted.sessionPolicy, "reuse", "the existing conversation reuse rule remains stable");

const roundTrip = toHeartbeatTask(adapted, projects, backendTasks[0]);
assert.equal(roundTrip.interval, "720h|monthly:31@08:30", "monthly schedule round-trips without losing day 31");
assert.equal(roundTrip.timeZone, "Asia/Shanghai", "time zone is persisted as an IANA identifier");
assert.deepEqual(roundTrip.notifyChannelIds, ["feishu-main"], "channel selection is persisted explicitly");
assert.throws(
  () => toHeartbeatTask({ ...adapted, id: "biweekly", freqType: "biweekly", startWeek: "" }, projects),
  /起始周/,
  "biweekly tasks cannot be saved without a selected start week",
);

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

let persisted: AutomationTask[] = [adapted];
const calls: string[] = [];
const runtime: RillSessionRuntime = {
  submit: async () => {},
  steer: async () => {},
  listAutomationTasks: async () => persisted,
  saveAutomationTask: async () => { throw new Error("heartbeat config locked"); },
  deleteAutomationTask: async (task) => {
    calls.push(`delete:${task.id}`);
    persisted = persisted.filter((candidate) => candidate.id !== task.id);
    return persisted;
  },
  toggleAutomationTask: async (task, enabled) => {
    calls.push(`toggle:${task.id}:${enabled}`);
    persisted = persisted.map((candidate) => candidate.id === task.id ? { ...candidate, enabled } : candidate);
    return persisted;
  },
  runAutomationTask: async (task) => {
    calls.push(`run:${task.id}`);
    persisted = persisted.map((candidate) => candidate.id === task.id ? { ...candidate, lastResult: "success", lastRun: "刚刚" } : candidate);
    return persisted;
  },
};

let store: Store | null = null;
function Probe() { store = useStore(); return null; }
function currentStore() { if (!store) throw new Error("store unavailable"); return store; }
const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(<StoreProvider seed={{ projects, channels, tasks: [adapted] }} runtime={runtime}><Probe /></StoreProvider>);
});

await act(async () => {
  assert.equal(await currentStore().saveTask({ ...adapted, name: "不应污染" }), false);
});
assert.equal(currentStore().tasks[0].name, adapted.name, "failed saves retain the backend-authoritative task snapshot");

await act(async () => {
  assert.equal(await currentStore().saveTask({ ...adapted, scope: "/repo/missing" }), false);
});
assert.equal(calls.length, 0, "an unavailable project is rejected before any backend mutation");

await act(async () => {
  assert.equal(await currentStore().toggleTask(adapted.id), true);
  assert.equal(await currentStore().runTaskNow(adapted.id), true);
  assert.equal(await currentStore().deleteTask(adapted.id), true);
});
assert.deepEqual(calls, ["toggle:monthly-31:false", "run:monthly-31", "delete:monthly-31"], "toggle, run/retry, and delete delegate to explicit backend actions");
assert.equal(currentStore().tasks.length, 0, "sequential backend results remain authoritative after delete");

await act(async () => root.unmount());
process.stdout.write("rill automation tests passed\n");
