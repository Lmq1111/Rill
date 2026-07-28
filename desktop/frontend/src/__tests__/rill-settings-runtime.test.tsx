// Run: tsx src/__tests__/rill-settings-runtime.test.tsx

import { strict as assert } from "node:assert";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type {
  CapabilityDiagnosticsReport,
  HooksSettingsView,
  MemoryView,
  PluginView,
  ServerView,
  SettingsView,
  SkillsSettingsView,
} from "../lib/types";
import {
  RillSettingsProvider,
  useRillSettings,
  type RillSettingsBackend,
  type RillSettingsContextValue,
} from "../rill/settings/runtime";

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

const settings = {
  desktopLanguage: "zh",
  closeBehavior: "background",
  displayMode: "compact",
  desktopLayoutStyle: "workbench",
  desktopTheme: "auto",
  desktopThemeStyle: "graphite",
  statusBarStyle: "text",
  statusBarItems: ["model"],
  defaultModel: "real/one",
  plannerModel: "real/one",
  subagentModel: "real/one",
  subagentEffort: "medium",
  autoPlan: "on",
  defaultToolApprovalMode: "ask",
  checkUpdates: false,
  telemetry: false,
  metrics: false,
  memoryCompilerEnabled: true,
  providers: [{ name: "real", models: ["one"], default: "one", keySet: true }],
  officialProviders: [],
  providerPresets: [],
  permissions: { mode: "ask", allow: [], ask: [], deny: [] },
  sandbox: { bash: "enforce", network: false, workspaceRoot: "", allowWrite: [], effectiveWorkspaceRoot: "/repo", effectiveWriteRoots: ["/repo"], shell: "auto" },
  network: { proxyMode: "off", proxyUrl: "", noProxy: "", proxy: { type: "http", server: "", port: 0, username: "", password: "", passwordSet: false } },
  agent: { temperature: 0.2, maxSteps: 40, plannerMaxSteps: 20, maxSubagentDepth: 2, systemPrompt: "", coldResumePrune: true, reasoningLanguage: "auto" },
  bot: { enabled: false, connections: [] },
  configPath: "/private/rillagent.toml",
  providerKinds: ["openai"],
  autoApproveTools: false,
  bypass: false,
} as unknown as SettingsView;

const servers = [{ name: "filesystem", transport: "stdio", status: "connected", autoStart: true, tools: 3, prompts: 0, resources: 0 }] as ServerView[];
const skills = { skills: [{ name: "rillagent-guide", description: "help", scope: "builtin", runAs: "inline", enabled: true }], skillRoots: [] } as SkillsSettingsView;
const plugins = [{ name: "devkit", root: "/plugins/devkit", enabled: true, skills: 1, hooks: 0, mcpServers: 0 }] as PluginView[];
const memory = { docs: [], facts: [], archives: [], scopes: [], storeDir: "/private/memory", available: true } as MemoryView;
const hooks = { scope: "global", path: "/private/settings.json", projectRoot: "", trusted: true, hooks: [], events: ["Stop"] } as HooksSettingsView;
const diagnostics = { schema_version: 1, root: "/private/repo", live: false, summary: { errors: 0, warnings: 0, infos: 0, instructions: 0, skills: 1, commands: 0, hooks: 0, plugins: 1, mcp_servers: 1 }, instructions: { docs: [] }, skills: { roots: [], entries: [], winners: 1, shadowed: 0 }, commands: { roots: [], entries: [], winners: 0, shadowed: 0 }, hooks: { trusted_project: true, project_defines_hooks: false, sources: [], entries: [] }, plugins: { packages: [] }, mcp: { servers: [] }, issues: [] } as CapabilityDiagnosticsReport;

let persistedLanguage = "zh";
let failSettingsRead = false;
const calls: string[] = [];
const backend = {
  async Settings() {
    if (failSettingsRead) throw new Error("settings locked");
    return structuredClone({ ...settings, desktopLanguage: persistedLanguage });
  },
  async MCPServers() { return structuredClone(servers); },
  async SkillsSettings() { return structuredClone(skills); },
  async Plugins() { return structuredClone(plugins); },
  async Memory() { return structuredClone(memory); },
  async HooksSettings() { return structuredClone(hooks); },
  async CapabilityDiagnostics() { return structuredClone(diagnostics); },
} as unknown as RillSettingsBackend;

let value: RillSettingsContextValue | null = null;
function Probe() {
  value = useRillSettings();
  return null;
}
function current() {
  if (!value) throw new Error("settings context unavailable");
  return value;
}

const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(<RillSettingsProvider backend={backend}><Probe /></RillSettingsProvider>);
});

assert.equal(current().snapshot?.settings.desktopLanguage, "zh", "the live settings snapshot is loaded");
assert.equal(current().snapshot?.servers[0].name, "filesystem", "MCP state is loaded from the backend");
assert.equal(current().snapshot?.skills.skills[0].name, "rillagent-guide", "skills are backend-authoritative");
assert.equal(current().snapshot?.plugins[0].name, "devkit", "plugins are backend-authoritative");
assert.equal(current().snapshot?.memory.available, true, "memory state is loaded");
assert.equal(current().snapshot?.hooks.events[0], "Stop", "hooks are loaded");
assert.equal(current().snapshot?.diagnostics.summary.mcp_servers, 1, "diagnostics are loaded");
assert.equal(JSON.stringify(current().snapshot).includes("api-key-plaintext"), false, "the settings snapshot contains no credential plaintext");

await act(async () => {
  const ok = await current().apply("保存语言", async () => {
    calls.push("failed-save");
    throw new Error("config readonly");
  });
  assert.equal(ok, false);
});
assert.equal(current().snapshot?.settings.desktopLanguage, "zh", "failed writes retain the previous authoritative snapshot");
assert.match(current().error, /config readonly/, "the real backend error remains reachable");

await act(async () => {
  const ok = await current().apply("保存语言", async () => {
    calls.push("successful-save");
    persistedLanguage = "en";
  });
  assert.equal(ok, true);
});
assert.equal(current().snapshot?.settings.desktopLanguage, "en", "successful writes re-read the authoritative backend snapshot");

failSettingsRead = true;
await act(async () => {
  assert.equal(await current().reload(), false);
});
assert.equal(current().snapshot?.settings.desktopLanguage, "en", "reload failure does not replace the last good snapshot");
assert.deepEqual(calls, ["failed-save", "successful-save"]);

await act(async () => root.unmount());
process.stdout.write("rill settings runtime tests passed\n");
