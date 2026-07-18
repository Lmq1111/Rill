import { brand } from "../../../lib/brand";

// 第二批设置页共享数据 —— 保持模型 / 机器人 / MCP / 技能 / 子智能体 / 插件之间的名称与状态一致
// 仅用于演示，非真实凭据或服务。

export type ConnState = "connected" | "failed" | "missingKey" | "disabled" | "testing";

/* ===== 模型服务商与模型 ===== */
export interface ModelDef {
  id: string;
  name: string;
  providerId: string;
  vision?: boolean;
  reasoning?: boolean;
  available: boolean;
}

export interface Provider {
  id: string;
  name: string;
  kind: "preset" | "openai" | "anthropic";
  baseUrl: string;
  keyEnv: string;
  hasKey: boolean;
  state: ConnState;
  modelCount: number;
}

export const providers: Provider[] = [
  { id: "pv1", name: `${brand.productName}官方预设`, kind: "preset", baseUrl: "https://api.example.invalid/v1", keyEnv: "RILLAGENT_API_KEY", hasKey: true, state: "connected", modelCount: 4 },
  { id: "pv2", name: "本地 vLLM", kind: "openai", baseUrl: "http://127.0.0.1:8000/v1", keyEnv: "VLLM_API_KEY", hasKey: true, state: "connected", modelCount: 2 },
  { id: "pv3", name: "Anthropic 兼容网关", kind: "anthropic", baseUrl: "https://gw.example.com", keyEnv: "ANTHROPIC_API_KEY", hasKey: false, state: "missingKey", modelCount: 0 },
];

export const models: ModelDef[] = [
  { id: "m1", name: "Opus 4.8", providerId: "pv1", vision: true, reasoning: true, available: true },
  { id: "m2", name: "Sonnet 4.6", providerId: "pv1", vision: true, reasoning: true, available: true },
  { id: "m3", name: "Haiku 4.5", providerId: "pv1", vision: true, available: true },
  { id: "m4", name: `${brand.productName}-Plan-Pro`, providerId: "pv1", reasoning: true, available: true },
  { id: "m5", name: "qwen2.5-coder-32b", providerId: "pv2", available: true },
  { id: "m6", name: "llama-3.3-70b", providerId: "pv2", available: false },
];

/* ===== 机器人渠道（与第一批 ch1 飞书 dev-rill 保持一致） ===== */
export interface Bot {
  id: string;
  name: string;
  channel: "飞书/Lark" | "QQ" | "微信";
  enabled: boolean;
  auth: ConnState;
  model: string;
  scope: string; // 项目名或“全局”
  sessions: number;
  lastError?: string;
  policy: "trusted" | "everyone";
}

export const bots: Bot[] = [
  { id: "b1", name: "dev-rill 群机器人", channel: "飞书/Lark", enabled: true, auth: "connected", model: "Opus 4.8", scope: "rill-web", sessions: 3, policy: "trusted" },
  { id: "b2", name: "QQ 客服助手", channel: "QQ", enabled: false, auth: "failed", model: "Sonnet 4.6", scope: "全局", sessions: 0, lastError: "凭据无效 (AppSecret 已过期)", policy: "everyone" },
];

/* ===== 插件（作为 Skills/Agents/MCP 的来源） ===== */
export interface Plugin {
  id: string;
  name: string;
  version: string;
  source: string;
  enabled: boolean;
  compat: "ok" | "partial" | "incompatible";
  issues: number;
  provides: { skills: number; agents: number; commands: number; hooks: number; mcp: number };
  invoke: string;
}

export const plugins: Plugin[] = [
  { id: "pl1", name: "rill-devkit", version: "1.4.2", source: "git: github.com/rill/devkit", enabled: true, compat: "ok", issues: 0, provides: { skills: 2, agents: 1, commands: 1, hooks: 1, mcp: 1 }, invoke: "rill-devkit" },
  { id: "pl2", name: "doc-writer", version: "0.9.0", source: "本地: ~/plugins/doc-writer", enabled: false, compat: "partial", issues: 2, provides: { skills: 1, agents: 0, commands: 2, hooks: 0, mcp: 0 }, invoke: "doc-writer" },
];

/* ===== MCP Server ===== */
export interface McpServer {
  id: string;
  name: string;
  origin: "内置" | "用户添加" | "插件导入";
  pluginId?: string;
  transport: "stdio" | "HTTP" | "Streamable HTTP" | "SSE";
  enabled: boolean;
  state: ConnState | "connecting" | "onDemand" | "authExpired";
  tools: number;
  lastError?: string;
}

export const mcpServers: McpServer[] = [
  { id: "mcp1", name: "文件系统", origin: "内置", transport: "stdio", enabled: true, state: "connected", tools: 7 },
  { id: "mcp2", name: "postgres-mcp", origin: "用户添加", transport: "Streamable HTTP", enabled: true, state: "authExpired", tools: 0, lastError: "OAuth 凭据已过期，需要重新认证" },
  { id: "mcp3", name: "devkit-tools", origin: "插件导入", pluginId: "pl1", transport: "stdio", enabled: true, state: "connected", tools: 4 },
];

/* ===== 技能 Skills ===== */
export interface Skill {
  id: string;
  name: string;
  invoke: string;
  desc: string;
  origin: "内置" | "用户" | "项目" | "插件";
  pluginId?: string;
  enabled: boolean;
  health: "ok" | "error";
}

export const skills: Skill[] = [
  { id: "sk1", name: `${brand.productName}使用向导`, invoke: "/rillagent-guide", desc: `${brand.productName}内置帮助技能，介绍常用操作与命令。`, origin: "内置", enabled: true, health: "ok" },
  { id: "sk2", name: "提交信息生成", invoke: "/commit-msg", desc: "根据暂存改动生成规范的提交信息。", origin: "用户", enabled: true, health: "ok" },
  { id: "sk3", name: "接口契约检查", invoke: "/api-check", desc: "校验当前项目接口与契约文件是否一致。", origin: "项目", enabled: false, health: "error" },
  { id: "sk4", name: "代码评审助手", invoke: "/devkit-review", desc: "对改动进行结构化评审（由插件提供）。", origin: "插件", pluginId: "pl1", enabled: true, health: "ok" },
  { id: "sk5", name: "发布检查", invoke: "/devkit-release", desc: "发布前检查版本、变更日志与产物。", origin: "插件", pluginId: "pl1", enabled: true, health: "ok" },
];

/* ===== 子智能体 Subagents ===== */
export interface Subagent {
  id: string;
  name: string;
  desc: string;
  origin: "内置" | "自定义" | "插件";
  pluginId?: string;
  model: string; // 或“继承默认”
  reasoning: string;
  tools: string; // “全部工具” 或 数量
  color?: string;
}

export const subagents: Subagent[] = [
  { id: "sa1", name: "Explore", desc: "只读探索代码库，定位相关文件与实现。", origin: "内置", model: "继承默认", reasoning: "继承默认", tools: "只读工具集", color: "#0ea5e9" },
  { id: "sa2", name: "Plan", desc: "为复杂任务设计实现方案。", origin: "内置", model: "Rill-Plan-Pro", reasoning: "高", tools: "只读工具集", color: "#8b5cf6" },
  { id: "sa3", name: "release-reviewer", desc: "发布评审专项子智能体（由插件提供）。", origin: "插件", pluginId: "pl1", model: "Sonnet 4.6", reasoning: "中", tools: "指定 6 项", color: "#f59e0b" },
  { id: "sa4", name: "doc-refiner", desc: "润色与整理文档的自定义子智能体。", origin: "自定义", model: "Haiku 4.5", reasoning: "低", tools: "指定 3 项", color: "#10b981" },
];

export const settingsTabs = [
  { id: "general", label: "通用", icon: "Settings2", group: "常规" },
  { id: "model", label: "模型", icon: "Cpu", group: "能力" },
  { id: "bot", label: "机器人", icon: "Bot", group: "能力" },
  { id: "mcp", label: "MCP 与工具", icon: "Plug", group: "能力" },
  { id: "skill", label: "技能", icon: "Sparkles", group: "能力" },
  { id: "subagent", label: "子智能体", icon: "Users", group: "能力" },
  { id: "plugin", label: "插件", icon: "Package", group: "能力" },
  { id: "memory", label: "记忆", icon: "Brain", group: "能力" },
  { id: "hooks", label: "Hooks", icon: "Webhook", group: "系统与安全" },
  { id: "permissions", label: "权限", icon: "ShieldCheck", group: "系统与安全" },
  { id: "sandbox", label: "沙箱", icon: "Box", group: "系统与安全" },
  { id: "network", label: "网络", icon: "Network", group: "系统与安全" },
  { id: "diagnostics", label: "诊断", icon: "Stethoscope", group: "系统与安全" },
  { id: "keys", label: "快捷键", icon: "Keyboard", group: "系统与安全" },
  { id: "appearance", label: "外观", icon: "Palette", group: "系统与安全" },
  { id: "about", label: "版本与隐私", icon: "Info", group: "系统与安全" },
] as const;
export type SettingsTab = (typeof settingsTabs)[number]["id"];

/* ===== 第三批：Hooks ===== */
export interface Hook {
  id: string;
  name: string;
  event: string;
  command: string;
  scope: "全局" | string;
  origin: "用户" | "项目" | "插件";
  pluginId?: string;
  enabled: boolean;
  lastResult: "ok" | "failed" | "timeout" | "never";
  lastRun?: string;
  highRisk?: boolean;
}

export const hooks: Hook[] = [
  { id: "hk1", name: "会话开始加载环境", event: "会话开始", command: "./scripts/load-env.sh", scope: "rill-web", origin: "项目", enabled: true, lastResult: "ok", lastRun: "今天 14:02" },
  { id: "hk2", name: "工具调用前记录审计", event: "工具调用前", command: "node tools/audit-log.js", scope: "全局", origin: "用户", enabled: true, lastResult: "ok", lastRun: "今天 13:40" },
  { id: "hk3", name: "任务完成后清理", event: "任务完成", command: "rm -rf ./.cache/tmp", scope: "全局", origin: "用户", enabled: false, lastResult: "failed", lastRun: "昨天 18:20", highRisk: true },
  { id: "hk4", name: "发布评审钩子", event: "会话结束", command: "rill-devkit run release-check", scope: "全局", origin: "插件", pluginId: "pl1", enabled: true, lastResult: "ok", lastRun: "今天 09:10" },
];

/* ===== 第三批：权限规则 ===== */
export interface PermRule {
  id: string;
  name: string;
  effect: "allow" | "deny";
  target: string;
  op: "文件写入" | "命令执行" | "网络访问" | "凭据读取" | "文件读取";
  scope: "全局" | string;
  origin: "用户" | "系统" | "项目" | "插件";
  enabled: boolean;
  lastHit?: string;
  highRisk?: boolean;
}

export const permRules: PermRule[] = [
  { id: "pr1", name: "禁止读取凭据文件", effect: "deny", target: "~/.ssh/**, **/.env", op: "凭据读取", scope: "全局", origin: "系统", enabled: true, lastHit: "今天 11:20", highRisk: true },
  { id: "pr2", name: "允许工作区内写入", effect: "allow", target: "~/work/rill/rill-web/**", op: "文件写入", scope: "rill-web", origin: "用户", enabled: true, lastHit: "今天 14:03" },
  { id: "pr3", name: "允许 git 命令", effect: "allow", target: "git *", op: "命令执行", scope: "全局", origin: "用户", enabled: true, lastHit: "今天 13:55" },
  { id: "pr4", name: "拒绝对外网络访问", effect: "deny", target: "*.internal 之外", op: "网络访问", scope: "全局", origin: "项目", enabled: false, highRisk: true },
];

/* ===== 第三批：诊断项 ===== */
export interface DiagItem {
  id: string;
  name: string;
  result: "ok" | "warn" | "error" | "unchecked" | "unavailable";
  severity: "正常" | "警告" | "错误" | "未检查" | "不可用";
  detail: string;
  suggestTab?: SettingsTab;
  checkedAt?: string;
}

export const diagItems: DiagItem[] = [
  { id: "d1", name: "应用版本与平台", result: "ok", severity: "正常", detail: "Rill 2.4.0 · Rillagent · macOS 15.4 arm64", checkedAt: "刚刚" },
  { id: "d2", name: "配置目录", result: "ok", severity: "正常", detail: "~/.rillagent 可读写", checkedAt: "刚刚" },
  { id: "d3", name: "模型连接", result: "warn", severity: "警告", detail: "Anthropic 兼容网关缺少密钥", checkedAt: "刚刚" },
  { id: "d4", name: "MCP Server", result: "error", severity: "错误", detail: "postgres-mcp OAuth 凭据已过期", suggestTab: "mcp", checkedAt: "刚刚" },
  { id: "d5", name: "技能", result: "warn", severity: "警告", detail: "/api-check 处于异常状态", suggestTab: "skill", checkedAt: "刚刚" },
  { id: "d6", name: "插件", result: "warn", severity: "警告", detail: "doc-writer 报告 2 个兼容问题", suggestTab: "plugin", checkedAt: "刚刚" },
  { id: "d7", name: "Hooks", result: "error", severity: "错误", detail: "任务完成后清理 钩子上次执行失败", suggestTab: "hooks", checkedAt: "刚刚" },
  { id: "d8", name: "沙箱后端", result: "warn", severity: "警告", detail: "当前为仅工作区可写，网络访问未受限", suggestTab: "sandbox", checkedAt: "刚刚" },
  { id: "d9", name: "运行依赖", result: "unavailable", severity: "不可用", detail: "seatbelt 后端在此系统不可用，已降级", checkedAt: "刚刚" },
];
