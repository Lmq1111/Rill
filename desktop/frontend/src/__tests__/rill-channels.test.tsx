// Run: tsx src/__tests__/rill-channels.test.tsx

import { strict as assert } from "node:assert";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { BotRuntimeStatusView, BotSettingsView } from "../lib/types";
import { adaptBotChannels, patchBotChannel } from "../rill/adapters/channels";
import { copyRemoteChannelID } from "../rill/components/workbench/ChannelDetail";
import {
  StoreProvider,
  useStore,
  type Channel,
  type Project,
  type RillSessionRuntime,
  type Store,
} from "../rill/state/visualStore";

const access = {
  enabled: true,
  allowAll: false,
  pairingEnabled: false,
  users: [" ou_user ", "ou_user", "ou_second"],
  groups: ["oc_group", " oc_group "],
  approvers: [],
  admins: [],
};

const bot = {
  enabled: true,
  connections: [{
    id: "feishu-lark",
    provider: "feishu",
    domain: "lark",
    label: "研发群机器人",
    enabled: true,
    status: "connected",
    model: "",
    toolApprovalMode: "ask",
    workspaceRoot: "/repo/a",
    access,
    credential: { appId: "cli_public", appSecretEnv: "LARK_BOT_APP_SECRET", accountId: "", tokenEnv: "", secretSet: true },
    sessionMappings: [{
      remoteId: "oc_full_remote_identifier",
      sessionId: "session-a",
      sessionSource: "/sessions/a.jsonl",
      chatType: "group",
      userId: "ou_user",
      threadId: "",
      scope: "project",
      workspaceRoot: "/repo/a",
      updatedAt: "2026-07-21T12:00:00Z",
    }],
    lastError: "",
    createdAt: "2026-07-20T12:00:00Z",
    updatedAt: "2026-07-21T12:00:00Z",
  }],
} as unknown as BotSettingsView;
const runtimeStatus: BotRuntimeStatusView = {
  running: true,
  status: "running",
  message: "1 bot connection(s) running",
  connections: 1,
  startedAt: "2026-07-21T12:00:00Z",
};
const projects: Project[] = [
  { id: "/repo/a", name: "真实项目 A", path: "/repo/a", branch: "main", status: "ok", expanded: true },
  { id: "/repo/unavailable", name: "不可用项目", path: "/repo/unavailable", branch: "main", status: "unavailable", expanded: true },
];

const [adapted] = adaptBotChannels(bot, runtimeStatus, projects, []);
assert.equal(adapted.remoteId, "oc_full_remote_identifier", "the full remote id remains available for real clipboard writes");
assert.deepEqual(adapted.users, ["ou_user", "ou_second"], "allowlist users are trimmed and deduplicated");
assert.deepEqual(adapted.groups, ["oc_group"], "allowlist groups are trimmed and deduplicated");
assert.equal(adapted.projectId, "/repo/a", "workspace roots resolve against the live project registry");
assert.equal(adapted.credentialSet, true, "only the non-sensitive credential presence flag reaches Rill");
assert.ok(!("secret" in adapted), "credential plaintext never enters the Rill channel view model");
assert.equal(await copyRemoteChannelID(adapted.remoteId, async () => false), false, "clipboard permission denial is surfaced to the channel UI");

const botWithStaleError = structuredClone(bot);
botWithStaleError.connections[0].lastError = "old startup error";
const [runtimeHealthy] = adaptBotChannels(botWithStaleError, {
  ...runtimeStatus,
  adapters: [{ id: "feishu-lark", status: "running", startedAt: runtimeStatus.startedAt, lastSyncAt: runtimeStatus.startedAt, lastErrorAt: "", lastError: "" }],
}, projects, []);
assert.equal(runtimeHealthy.connState, "connected", "current per-connection runtime health overrides a stale persisted startup error");
assert.equal(runtimeHealthy.lastError, "", "a recovered runtime does not keep showing the stale connection error");

const patched = patchBotChannel(bot, "feishu-lark", {
  users: ["ou_user", " ou_user ", "ou_added"],
  groups: ["oc_group", "oc_group"],
  projectId: "/repo/a",
}, projects);
assert.deepEqual(patched.connections[0].access.users, ["ou_user", "ou_added"], "saved member allowlists are deduplicated");
assert.deepEqual(patched.connections[0].access.groups, ["oc_group"], "saved group allowlists are deduplicated");
assert.equal(patched.connections[0].workspaceRoot, "/repo/a", "selected live project path is persisted");
assert.throws(
  () => patchBotChannel(bot, "feishu-lark", { projectId: "/repo/unavailable" }, projects),
  /项目不可用/,
  "an unavailable project cannot be persisted as a channel workspace",
);

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

const initialChannel: Channel = adapted;
let persisted = [initialChannel];
const calls: string[] = [];
const runtime: RillSessionRuntime = {
  submit: async () => {},
  steer: async () => {},
  listChannels: async () => persisted,
  saveChannel: async () => { throw new Error("config locked"); },
  saveChannelSecret: async () => { throw new Error("keyring denied"); },
  reconnectChannel: async (channel) => {
    calls.push(`reconnect:${channel.id}`);
    persisted = [{ ...channel, connState: "connected", lastError: "" }];
    return persisted;
  },
};

let store: Store | null = null;
function Probe() { store = useStore(); return null; }
function currentStore() { if (!store) throw new Error("store unavailable"); return store; }
const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(<StoreProvider seed={{ projects, channels: [initialChannel] }} runtime={runtime}><Probe /></StoreProvider>);
});

await act(async () => {
  assert.equal(await currentStore().saveChannel("feishu-lark", { users: ["polluted"] }), false);
});
assert.deepEqual(currentStore().channels[0].users, initialChannel.users, "failed config saves retain the backend-authoritative channel snapshot");

await act(async () => {
  assert.equal(await currentStore().saveChannelSecret("feishu-lark", "never-render-this"), false);
});
assert.equal(currentStore().channels[0].credentialSet, true, "failed secret saves do not invent a new persisted credential state");

await act(async () => {
  assert.equal(await currentStore().reconnectChannel("feishu-lark"), true);
});
assert.ok(calls.includes("reconnect:feishu-lark"), "reconnect delegates to the real runtime action");
await act(async () => root.unmount());

process.stdout.write("rill channel tests passed\n");
