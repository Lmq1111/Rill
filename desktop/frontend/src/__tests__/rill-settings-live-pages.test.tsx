// Run: tsx src/__tests__/rill-settings-live-pages.test.tsx

import { strict as assert } from "node:assert";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CapabilityDiagnosticsReport, HooksSettingsView, MemoryView, PluginView, ServerView, SettingsView, SkillsSettingsView } from "../lib/types";
import { AboutSettings } from "../rill/components/settings/AboutSettings";
import { BotSettings } from "../rill/components/settings/BotSettings";
import { DiagnosticsSettings } from "../rill/components/settings/DiagnosticsSettings";
import { KeyboardSettings } from "../rill/components/settings/KeyboardSettings";
import { ModelSettings } from "../rill/components/settings/ModelSettings";
import { GeneralSettings } from "../rill/components/settings/GeneralSettings";
import { PermissionSettings } from "../rill/components/settings/PermissionSettings";
import { AppearanceSettings } from "../rill/components/settings/AppearanceSettings";
import { HooksSettings } from "../rill/components/settings/HooksSettings";
import { McpSettings } from "../rill/components/settings/McpSettings";
import { SubagentSettings } from "../rill/components/settings/SubagentSettings";
import { RillSettingsProvider, type RillSettingsBackend } from "../rill/settings/runtime";
import { StoreProvider } from "../rill/state/visualStore";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.StorageEvent = dom.window.StorageEvent;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.Event = dom.window.Event;
globalThis.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" });

const clipboardWrites: string[] = [];
Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { clipboardWrites.push(value); } } });

const now = new Date().toISOString();
let settings = {
  defaultModel: "real/m1", plannerModel: "real/m1", subagentModel: "real/m1", subagentEffort: "medium", autoPlan: "off",
  providers: [{ name: "real", builtIn: false, added: true, kind: "openai", baseUrl: "https://model.invalid/v1", chatUrl: "", models: ["m1"], visionModels: [], visionModelsConfigured: false, modelsUrl: "", default: "m1", apiKeyEnv: "REAL_API_KEY", headers: {}, extraBody: {}, authHeader: false, keySet: true, requiresKey: true, configured: true, keySource: "credentials", keySourcePath: "", balanceUrl: "", contextWindow: 128000, reasoningProtocol: "auto", thinking: "", supportedEfforts: ["medium"], defaultEffort: "medium", modelOverrides: [] }],
  officialProviders: [], providerPresets: [], providerKinds: ["openai"],
  permissions: { mode: "ask", allow: [], ask: [], deny: [] },
  sandbox: { bash: "enforce", network: false, workspaceRoot: "", allowWrite: [], effectiveWorkspaceRoot: "/repo", effectiveWriteRoots: ["/repo"], shell: "auto", effectiveShell: "bash" },
  network: { proxyMode: "off", proxyUrl: "", noProxy: "", proxy: { type: "http", server: "", port: 0, username: "", password: "", passwordSet: false } },
  agent: { temperature: 0.2, maxSteps: 40, plannerMaxSteps: 20, maxSubagentDepth: 2, systemPrompt: "", coldResumePrune: true, reasoningLanguage: "auto" },
  bot: {
    enabled: true, model: "real/m1", toolApprovalMode: "ask", maxSteps: 40, debounceMs: 800, queueMode: "serial", queueCap: 100, queueDrop: "oldest", ignoreSelfMessages: true,
    selfUserIds: { qq: [], feishu: [], weixin: [] }, control: { enabled: false, addr: "", tokenEnv: "" }, pairing: { enabled: true, requestTtlMinutes: 10, maxPendingPerPlatform: 5 }, routes: [],
    allowlist: { enabled: true, allowAll: false, qqUsers: [], feishuUsers: [], weixinUsers: [], qqApprovers: [], feishuApprovers: [], weixinApprovers: [], qqAdmins: [], feishuAdmins: [], weixinAdmins: [], qqGroups: [], feishuGroups: [], weixinGroups: [] },
    qq: { enabled: false, appId: "", appSecretEnv: "QQ_BOT_APP_SECRET", secretSet: false, sandbox: false, model: "", toolApprovalMode: "ask", workspaceRoot: "", access: { enabled: true, allowAll: false, pairingEnabled: true, users: [], groups: [], approvers: [], admins: [] } },
    feishu: { enabled: false, domain: "feishu", appId: "", appSecretEnv: "FEISHU_BOT_APP_SECRET", secretSet: false, verificationToken: "", mode: "websocket", webhookPort: 0, requireMention: true },
    weixin: { enabled: false, accountId: "", tokenEnv: "WEIXIN_BOT_TOKEN", tokenSet: false, apiBase: "" },
    connections: [{ id: "real-bot", provider: "feishu", domain: "feishu", label: "真实飞书", enabled: true, status: "connected", model: "real/m1", toolApprovalMode: "ask", workspaceRoot: "/repo", access: { enabled: true, allowAll: false, pairingEnabled: true, users: ["u1"], groups: [], approvers: [], admins: [] }, credential: { appId: "cli", appSecretEnv: "FEISHU_BOT_APP_SECRET", accountId: "", tokenEnv: "", secretSet: true }, sessionMappings: [], lastError: "", createdAt: now, updatedAt: now }],
  },
  desktopLanguage: "zh", desktopLayoutStyle: "workbench", desktopTheme: "auto", desktopThemeStyle: "graphite", closeBehavior: "background", displayMode: "compact", statusBarStyle: "text", statusBarItems: ["model"], defaultToolApprovalMode: "ask", checkUpdates: true, telemetry: true, metrics: true, memoryCompilerEnabled: true, expandThinking: false,
  desktopShortcuts: { "app.newSession": JSON.stringify({ key: "p", ctrl: false, meta: true, alt: false, shift: true }) }, desktopFontFamily: "system", desktopMonoFontFamily: "jetbrains", desktopTextSize: "default", desktopZoomFactor: 1,
  configPath: "/Users/private/.rillagent/config.toml", autoApproveTools: false, bypass: false,
} as SettingsView;

const diagnostics = { schema_version: 1, root: "/Users/private/repo", live: false, summary: { errors: 0, warnings: 0, infos: 0, instructions: 0, skills: 0, commands: 0, hooks: 0, plugins: 0, mcp_servers: 0 }, instructions: { docs: [] }, skills: { roots: [], entries: [], winners: 0, shadowed: 0 }, commands: { roots: [], entries: [], winners: 0, shadowed: 0 }, hooks: { trusted_project: true, project_defines_hooks: false, sources: [], entries: [] }, plugins: { packages: [] }, mcp: { servers: [] }, issues: [] } as CapabilityDiagnosticsReport;
const calls: string[] = [];
let exported = "";
let subagentPrompt = "只处理文档";
const backend = {
  async Settings() { return structuredClone(settings); },
  async MCPServers() { return [] as ServerView[]; },
  async SkillsSettings() { return { skills: [{ name: "writer", description: "写作助手", scope: "global", runAs: "subagent", enabled: true, body: subagentPrompt, allowedTools: ["read_file"], invocationMode: "manual" }], skillRoots: [] } as unknown as SkillsSettingsView; },
  async Plugins() { return [] as PluginView[]; },
  async Memory() { return { docs: [], facts: [], archives: [], scopes: [], storeDir: "", available: true } as MemoryView; },
  async HooksSettings() { return { scope: "global", path: "", projectRoot: "", trusted: true, hooks: [{ event: "Stop", command: "echo done", description: "可停用 Hook", disabled: true }], events: ["Stop"] } as HooksSettingsView; },
  async CapabilityDiagnostics() { calls.push("diagnostics"); return structuredClone(diagnostics); },
  async FetchProviderModels() { calls.push("fetch-models"); return ["m1", "m2"]; },
  async SaveProvider(provider: SettingsView["providers"][number]) { calls.push("save-provider"); settings = { ...settings, providers: settings.providers.map((item) => item.name === provider.name ? structuredClone(provider) : item) }; },
  async SetBotSettings(bot: SettingsView["bot"]) { calls.push("save-bot"); settings = { ...settings, bot: structuredClone(bot) }; },
  async DiagnoseBotConnection(id: string) { calls.push(`diagnose:${id}`); return { id, label: "真实飞书", status: "ok", message: "配置可用", messageId: "", phase: "config", code: "ok", reportKind: "", reportDetail: "", occurredAt: now }; },
  async TestBotConnection(id: string) { calls.push(`test:${id}`); return { id, label: "真实飞书", status: "ok", message: "连接成功", messageId: "", phase: "runtime", code: "ok", reportKind: "", reportDetail: "", occurredAt: now }; },
  async PickExportFile() { calls.push("pick-export"); return "/tmp/rill-diagnostics.json"; },
  async SaveExportFile(_path: string, payload: string) { calls.push("save-export"); exported = payload; },
  async SetDesktopShortcuts(shortcuts: Record<string, string>) { calls.push("save-shortcuts"); settings = { ...settings, desktopShortcuts: structuredClone(shortcuts) }; },
  async SetGeneralSettings(input: any) { calls.push("save-general"); settings = { ...settings, desktopLanguage: input.language, desktopLayoutStyle: input.layoutStyle, closeBehavior: input.closeBehavior, displayMode: input.displayMode, expandThinking: input.expandThinking, defaultToolApprovalMode: input.defaultToolApprovalMode, autoPlan: input.autoPlan, memoryCompilerEnabled: input.memoryCompilerEnabled, statusBarStyle: input.statusBarStyle, statusBarItems: [...input.statusBarItems] }; },
  async SetPermissions(mode: string, allow: string[], ask: string[], deny: string[]) { calls.push("save-permissions"); settings = { ...settings, permissions: { mode, allow: [...allow], ask: [...ask], deny: [...deny] } }; },
  async SetDesktopVisualPreferences(theme: string, style: string, font: string, mono: string, size: string, zoom: number) { calls.push("save-appearance"); settings = { ...settings, desktopTheme: theme, desktopThemeStyle: style, desktopFontFamily: font, desktopMonoFontFamily: mono, desktopTextSize: size, desktopZoomFactor: zoom }; },
  async SaveHooksSettingsForRoot(_scope: string, _root: string, hooks: HooksSettingsView["hooks"]) { calls.push(`save-hooks:${hooks[0]?.disabled}`); },
  async UpdateSubagentProfile(_name: string, _scope: string, input: { systemPrompt: string; allowedTools?: string[] }) { calls.push(`save-subagent:${input.systemPrompt}:${input.allowedTools?.join(",")}`); subagentPrompt = input.systemPrompt; },
  async Version() { return "v0.1.0-live"; },
  async OpenRillReleases() { calls.push("open-releases"); },
  async RevealPath() { calls.push("reveal-config"); },
} as unknown as RillSettingsBackend;

function flush() { return new Promise((resolve) => setTimeout(resolve, 0)); }
async function waitFor(label: string, predicate: () => boolean) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await act(async () => { await flush(); });
    if (predicate()) return;
  }
  throw new Error(`timed out waiting for ${label}: ${document.body.textContent?.slice(0, 500)}`);
}
function button(container: HTMLElement, text: string) {
  const result = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes(text));
  assert.ok(result, `missing button: ${text}`);
  return result as HTMLButtonElement;
}

let root: Root | null = null;
async function render(page: React.ReactNode) {
  if (root) await act(async () => root!.unmount());
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById("root")!;
  root = createRoot(container);
  await act(async () => { root!.render(<StoreProvider seed={{ channels: [{ id: "real-bot", name: "真实飞书", type: "飞书", status: "connected", whitelistOn: true, whitelist: [], routes: [], projectId: "global", sessionIds: [], credentialSet: true, remoteId: "real-bot" }] }}><RillSettingsProvider backend={backend}>{page}</RillSettingsProvider></StoreProvider>); });
  await waitFor("settings snapshot", () => !container.textContent?.includes("正在读取"));
  return container;
}

let container = await render(<ModelSettings />);
assert.match(container.textContent || "", /real/);
assert.doesNotMatch(container.textContent || "", /演示状态/);
await act(async () => { button(container, "测试并刷新").click(); await flush(); });
await waitFor("provider model refresh", () => calls.includes("save-provider"));
assert.ok(calls.includes("fetch-models"));

container = await render(<BotSettings />);
assert.match(container.textContent || "", /真实飞书/);
await act(async () => { button(container, "测试连接").click(); await flush(); });
await waitFor("bot test", () => calls.includes("test:real-bot"));
assert.match(container.textContent || "", /连接成功/);

container = await render(<DiagnosticsSettings goTo={() => {}} />);
assert.doesNotMatch(container.textContent || "", /模拟导出失败|演示状态/);
await act(async () => { button(container, "导出 JSON").click(); await flush(); });
await waitFor("diagnostics export", () => calls.includes("save-export"));
assert.doesNotMatch(exported, /\/Users\/private/);
assert.match(exported, /redactedFields/);

container = await render(<KeyboardSettings />);
await act(async () => { button(container, "恢复全部默认").click(); await flush(); });
await act(async () => { button(container, "全部恢复").click(); await flush(); });
await act(async () => { button(container, "保存").click(); await flush(); });
await waitFor("shortcut save", () => calls.includes("save-shortcuts"));
assert.deepEqual(settings.desktopShortcuts, {});

container = await render(<AboutSettings goTo={() => {}} />);
await waitFor("version", () => (container.textContent || "").includes("v0.1.0-live"));
assert.doesNotMatch(container.textContent || "", /演示状态|模拟导出失败/);
await act(async () => { button(container, "打开 Rill Releases").click(); await flush(); });
assert.ok(calls.includes("open-releases"));

container = await render(<GeneralSettings />);
assert.doesNotMatch(container.textContent || "", /提示音与背景音|保留后台运行|宽松|詳細/);
const language = container.querySelector("select") as HTMLSelectElement;
await act(async () => { language.value = "English"; language.dispatchEvent(new dom.window.Event("change", { bubbles: true })); await flush(); });
await act(async () => { button(container, "保存").click(); await flush(); });
await waitFor("atomic general save", () => calls.includes("save-general"));

container = await render(<PermissionSettings />);
const permissionMode = container.querySelector("select") as HTMLSelectElement;
await act(async () => { permissionMode.value = "按风险询问"; permissionMode.dispatchEvent(new dom.window.Event("change", { bubbles: true })); await flush(); });
await act(async () => { button(container, "保存").click(); await flush(); });
await waitFor("atomic permission save", () => calls.includes("save-permissions"));

container = await render(<AppearanceSettings />);
await act(async () => { button(container, "深色").click(); await flush(); });
await act(async () => { button(container, "保存").click(); await flush(); });
await waitFor("atomic appearance save", () => calls.includes("save-appearance"));

container = await render(<HooksSettings />);
assert.match(container.textContent || "", /可停用 Hook/);
const hookToggle = container.querySelector("button.relative.h-6") as HTMLButtonElement;
await act(async () => { hookToggle.click(); await flush(); });
await waitFor("disabled hook persistence", () => calls.includes("save-hooks:false"));

container = await render(<McpSettings />);
await act(async () => { button(container, "新增 Server").click(); await flush(); });
assert.doesNotMatch(container.textContent || "", /JSON 导入|工作目录 \/ 认证信息|校验配置/);

container = await render(<SubagentSettings />);
assert.match(container.textContent || "", /写作助手/);
assert.doesNotMatch(container.textContent || "", /已取消试运行/);
await act(async () => { button(container, "编辑").click(); await flush(); });
const prompt = container.querySelector("textarea") as HTMLTextAreaElement;
assert.equal(prompt.value, "只处理文档");
await act(async () => { button(container, "保存").click(); await flush(); });
await waitFor("subagent prompt save", () => calls.some((call) => call.startsWith("save-subagent:")));
assert.ok(calls.includes("save-subagent:只处理文档:read_file"), JSON.stringify(calls));

await act(async () => root?.unmount());
process.stdout.write("rill settings live pages tests passed\n");
