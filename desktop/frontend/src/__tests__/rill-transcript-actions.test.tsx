// Run: tsx src/__tests__/rill-transcript-actions.test.tsx
import { strict as assert } from "node:assert";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Conversation } from "../rill/components/workbench/Conversation";
import { adaptLiveSession } from "../rill/adapters/live";
import { StoreProvider, useStore, type Message, type RillSessionRuntime, type Store } from "../rill/state/visualStore";
import type { TabMeta } from "../lib/types";

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

const tab: TabMeta = { id: "tab-a", scope: "project", workspaceRoot: "/repo/a", workspaceName: "a", topicId: "topic-a", topicTitle: "节点操作", label: "model-a", ready: true, running: false, active: true, cwd: "/repo/a", mode: "normal" };
const live = adaptLiveSession(tab, {
  items: [{ kind: "user", id: "u1", text: "原问题", submitText: "隐藏上下文\n原问题", checkpointTurn: 7 }],
  running: false,
  hydrating: false,
  context: { used: 0, window: 1000, sessionTokens: 0 },
  meta: { label: "model-a", ready: true, eventChannel: "events", cwd: "/repo/a", workspaceRoot: "/repo/a" },
  modelsAvailable: true,
});
assert.equal(live.messages[0]?.checkpointTurn, 7, "live user messages retain the backend checkpoint turn");
assert.equal(live.messages[0]?.submitText, "隐藏上下文\n原问题", "live user messages retain the original submitted text");

let store: Store | null = null;
const calls: string[] = [];
const runtime: RillSessionRuntime = {
  submit: async () => {}, steer: async () => {},
  edit: async (_session, message, next) => { calls.push(`edit:${message.checkpointTurn}:${next}:${message.submitText}`); },
  rewind: async (_session, message) => { calls.push(`rewind:${message.checkpointTurn}`); },
};
function Probe() { store = useStore(); return null; }
function currentStore() { if (!store) throw new Error("store unavailable"); return store; }
const root = createRoot(document.getElementById("root")!);
await act(async () => { root.render(<StoreProvider seed={{ sessions: [live], projects: [{ id: "/repo/a", name: "a", path: "/repo/a", branch: "main", status: "ok", expanded: true }], activeSessionId: live.id }} runtime={runtime}><Conversation /><Probe /></StoreProvider>); });
const message = currentStore().active.messages[0] as Message;
await act(async () => { await currentStore().editAndRerun(live.id, message.id, "修改后的问题"); });
await act(async () => { await currentStore().rewindTo(live.id, message.id); });
assert.deepEqual(calls, ["edit:7:修改后的问题:隐藏上下文\n原问题", "rewind:7"], "message actions use the real checkpoint metadata");

const unavailable = adaptLiveSession(tab, { items: [], running: false, hydrating: false, context: { used: 0, window: 0, sessionTokens: 0 }, meta: { label: "", ready: true, eventChannel: "events", cwd: "/repo/a", workspaceRoot: "/repo/a" }, modelsAvailable: false });
assert.equal(unavailable.runState, "modelUnavailable", "an empty real model registry reaches model-unavailable state");
await act(async () => { root.render(<StoreProvider seed={{ sessions: [unavailable], projects: [{ id: "/repo/a", name: "a", path: "/repo/a", branch: "main", status: "ok", expanded: true }], activeSessionId: unavailable.id }}><Conversation /></StoreProvider>); });
assert.ok(document.body.textContent?.includes("模型不可用"), "model-unavailable guidance is visible");

await act(async () => root.unmount());
process.stdout.write("rill transcript action tests passed\n");
