// Run: tsx src/__tests__/rill-p0-session-guards.test.tsx

import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Composer } from "../rill/components/workbench/Composer";
import { History } from "../rill/components/workbench/History";
import { Sidebar } from "../rill/components/workbench/Sidebar";
import {
  StoreProvider,
  useStore,
  type RillSessionRuntime,
  type Store,
  type VisualStoreSeed,
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
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    matches: false,
    media: "",
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }),
});

let passed = 0;
let failed = 0;
let root: Root | null = null;
let storeSnapshot: Store | null = null;

function ok(value: boolean, label: string) {
  if (value) {
    process.stdout.write(`  PASS  ${label}\n`);
    passed += 1;
  } else {
    process.stdout.write(`  FAIL  ${label}\n`);
    failed += 1;
  }
}

function Probe() {
  storeSnapshot = useStore();
  return null;
}

async function render(component: React.ReactNode, seed: VisualStoreSeed, runtime?: RillSessionRuntime) {
  if (root) {
    await act(async () => root?.unmount());
  }
  document.body.innerHTML = '<div id="root"></div>';
  const target = document.getElementById("root");
  if (!target) throw new Error("missing test root");
  root = createRoot(target);
  await act(async () => {
    root?.render(
      <StoreProvider seed={seed} runtime={runtime}>
        {component}
        <Probe />
      </StoreProvider>,
    );
  });
}

function buttonWithText(text: string) {
  return Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes(text));
}

console.log("\nrill P0 session guards");

await render(<Sidebar />, { activeSessionId: "s6" });
await act(async () => {
  buttonWithText("新建会话")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
ok(storeSnapshot?.active.projectId === "p2", "P0-1 creates a new session in the active project");
const activeBeforeMissingProject = storeSnapshot?.activeSessionId;
await act(async () => {
  storeSnapshot?.createSession("deleted-project");
});
ok(
  storeSnapshot?.activeSessionId === activeBeforeMissingProject,
  "P0-1 refuses creation when the target project no longer exists",
);

const runtimeCalls: string[] = [];
await render(<Composer />, {
  activeSessionId: "s1",
  activeSessionPatch: { runState: "aiRunning", draft: "先补充单元测试，再继续实现" },
}, {
  submit: async (_session, input) => { runtimeCalls.push(`submit:${input}`); },
  steer: async (_session, input) => { runtimeCalls.push(`steer:${input}`); },
});
const composer = document.querySelector("textarea")?.parentElement;
const send = composer?.querySelector("button.bg-teal-600") as HTMLButtonElement | null;
ok(Boolean(send && !send.disabled), "P0-2 keeps the supplement send action enabled while AI is running");
await act(async () => {
  send?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
});
ok(
  runtimeCalls.join(",") === "steer:先补充单元测试，再继续实现",
  "P0-2 routes a running-session supplement to the steer runtime action",
);

await render(<Composer />, {
  activeSessionId: "s1",
  activeSessionPatch: { runState: "aiRunning", draft: "发送失败后保留这段草稿" },
}, {
  submit: async () => {},
  steer: async () => { throw new Error("steer unavailable"); },
});
const failingSend = document.querySelector("textarea")?.parentElement
  ?.querySelector("button.bg-teal-600") as HTMLButtonElement | null;
await act(async () => {
  failingSend?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
});
ok(
  storeSnapshot?.active.draft === "发送失败后保留这段草稿",
  "P0-2 preserves the supplement draft when steer fails",
);

await render(<History />, { activeSessionId: "s1" });
const before = document.querySelector("h2")?.textContent;
const secondRow = Array.from(document.querySelectorAll("div.cursor-pointer"))
  .find((row) => row.textContent?.includes("修复会话切换时草稿串号问题"));
await act(async () => {
  secondRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
const afterClick = document.querySelector("h2")?.textContent;
ok(
  before === "重构主工作台三栏布局" && afterClick === before,
  "P0-3 ignores history row clicks while the active session is busy",
);
await act(async () => {
  secondRow?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
});
ok(
  document.querySelector("h2")?.textContent === before,
  "P0-3 ignores history keyboard selection while the active session is busy",
);

await render(<History />, { activeSessionId: "s3" });
const idleSecondRow = Array.from(document.querySelectorAll("div.cursor-pointer"))
  .find((row) => row.textContent?.includes("修复会话切换时草稿串号问题"));
await act(async () => {
  idleSecondRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
ok(
  document.querySelector("h2")?.textContent === "修复会话切换时草稿串号问题",
  "P0-3 restores history selection after the busy state ends",
);

if (root) await act(async () => root?.unmount());

if (failed > 0) {
  process.stderr.write(`\n${failed} Rill P0 guard test(s) failed; ${passed} passed.\n`);
  process.exit(1);
}

process.stdout.write(`\n${passed} Rill P0 guard tests passed.\n`);
