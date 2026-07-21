// Run: tsx src/__tests__/rill-slash-commands.test.tsx
import { strict as assert } from "node:assert";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Composer } from "../rill/components/workbench/Composer";
import { StoreProvider, useStore, type RillSessionRuntime, type Store } from "../rill/state/visualStore";

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.MouseEvent = dom.window.MouseEvent;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

let store: Store | null = null;
const submissions: string[] = [];
const runtime: RillSessionRuntime = {
  submit: async (_session, input) => { submissions.push(input); },
  steer: async () => {},
  commands: async () => [
    { name: "new", description: "新建会话", kind: "builtin", group: "actions" },
    { name: "review", description: "执行项目审查", kind: "custom", group: "skills" },
  ],
};
function Probe() { store = useStore(); return null; }
function currentStore() { if (!store) throw new Error("store unavailable"); return store; }

const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(<StoreProvider seed={{ activeSessionId: "s3" }} runtime={runtime}><Composer /><Probe /></StoreProvider>);
  await Promise.resolve();
});
await act(async () => { await currentStore().refreshSlashCommands(); });
assert.deepEqual(currentStore().slashCommands.map((command) => command.name), ["new", "review"], "slash commands come from the live backend");

await act(async () => { currentStore().setDraft(currentStore().active.id, "/"); });
assert.ok(document.body.textContent?.includes("执行项目审查"), "the backend command list is reachable in the composer");
const review = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("/review"));
if (!review) throw new Error("missing live review command");
await act(async () => { review.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
assert.equal(currentStore().active.draft, "/review ", "selecting a command prepares the real slash invocation");
await act(async () => { currentStore().setDraft(currentStore().active.id, "/review 检查当前改动"); });
await act(async () => { await currentStore().sendMessage(currentStore().active.id); });
assert.deepEqual(submissions, ["/review 检查当前改动"], "slash execution is submitted to the live controller");

await act(async () => root.unmount());
process.stdout.write("rill slash command tests passed\n");
