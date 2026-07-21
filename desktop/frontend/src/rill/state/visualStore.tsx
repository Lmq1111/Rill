import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { CommandInfo } from "../../lib/types";

/* ============================================================
   Rill / Rillagent —— 统一数据状态
   每个会话独立保存草稿、附件、引用、消息、模型设置、运行状态等。
   切换项目 / 会话时所有派生视图随之切换。
   ============================================================ */

export type Route =
  | "workbench"
  | "channel"
  | "history"
  | "recycle"
  | "automation"
  | "context"
  | "files"
  | "changes"
  | "settings";

export type SessionSource = "local" | "bot" | "schedule";

// 明确、互斥的会话运行状态
export type RunState =
  | "empty" // 首次空会话
  | "loading" // 会话加载中
  | "idle" // 正常可编辑
  | "aiRunning" // AI 输出中
  | "awaitingAnswer" // 等待用户回答
  | "awaitingConfirm" // 等待敏感操作确认
  | "success" // 执行成功
  | "failed" // 执行失败（工具调用失败）
  | "readonly" // 只读历史会话
  | "safeMode" // 安全模式
  | "startFailed" // 启动失败
  | "modelUnavailable"; // 模型不可用

export interface ProjectRef { path: string; branch: string; }

export interface Project {
  id: string;
  name: string;
  path: string;
  branch: string;
  status: "ok" | "unavailable" | "loading";
  expanded: boolean;
  isolated?: { from: string; }; // 隔离交付工作区
}

export interface Attachment { id: string; name: string; kind: "image" | "file"; size: string; }
export interface Ref { id: string; kind: "file" | "snippet" | "path" | "diff" | "diffSnippet"; label: string; detail?: string; }

export type MsgType =
  | "user" | "ai" | "reasoning" | "tool" | "output" | "code"
  | "notice" | "tasklist" | "compress" | "error" | "answered";

export interface Message {
  id: string;
  type: MsgType;
  text?: string;
  refs?: string[];
  // tool / code
  tool?: string; cmd?: string; ok?: boolean; out?: string;
  file?: string; added?: number; removed?: number; codeLines?: { t: string; kind?: "add" | "del" | "ctx" }[];
  // tasklist
  tasks?: { t: string; state: "done" | "running" | "todo" }[];
  // notice tone
  tone?: string;
  thought?: string;
}

export interface PendingConfirm {
  op: string; command: string; scope: string; workdir: string; risk: string;
}
export interface PendingQuestion { q: string; options: string[]; }

export interface SessionContext {
  used: number; limit: number; rounds: number;
  roundTokens: number; cacheHit: number | null; cacheMiss: number | null;
  roundCost: number | null; totalCost: number | null; currency: string;
  balance: number | null; refreshedAt: string;
}

export interface SessionSettings {
  model: string; reasoning: string; exec: string; collab: string; permission: string;
}

export interface Session {
  id: string;
  topicId?: string;
  sessionPath?: string;
  title: string;
  summary: string;
  projectId: string;
  source: SessionSource;
  sourceDetail?: string; // 机器人连接 / 自动化任务名
  channelId?: string;
  scheduleTaskId?: string;
  runState: RunState;
  updatedAt: string;
  createdAt: string;
  unread?: number;
  draft: string;
  attachments: Attachment[];
  refs: Ref[];
  messages: Message[];
  settings: SessionSettings;
  context: SessionContext;
  pendingConfirm?: PendingConfirm;
  pendingQuestion?: PendingQuestion;
  error?: string;
  modelContextClearedAt?: string;
}

export interface Recycled {
  id: string; title: string; summary: string; projectId: string;
  source: SessionSource; deletedAt: string; restoreCopy?: boolean;
  snapshot: Session;
}

/* ============ 文件树 & Git 改动（按项目） ============ */
export interface FileNode {
  path: string; name: string; type: "file" | "dir";
  kind?: "text" | "binary" | "empty" | "unreadable"; content?: string; large?: boolean; updatedFlag?: boolean;
}
export type DiffStatus = "added" | "modified" | "deleted" | "renamed" | "untracked" | "binary";
export interface DiffFile {
  path: string; status: DiffStatus; oldPath?: string; added: number; removed: number;
  hunks?: { lines: { t: string; kind: "add" | "del" | "ctx" }[] }[];
  aiNote?: string;
}

/* ============ 渠道 ============ */
export interface Channel {
  id: string; type: "飞书/Lark" | "QQ" | "微信"; name: string;
  connState: "connected" | "failed" | "credExpired" | "missingConfig";
  hasAssociation: boolean; // 是否存在关联会话（与连接状态独立）
  remoteId: string; scope: "全局" | string; projectId?: string;
  policy: "trusted" | "everyone"; whitelistOn: boolean; userHit: boolean;
  users: string[]; groups: string[]; lastSync: string; sessionIds: string[];
}

/* ============ 自动化任务 ============ */
export interface AutomationTask {
  id: string; name: string; prompt: string; scope: "全局" | string;
  freqType: "interval" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  intervalVal: number; intervalUnit: string; time: string; weekday: string; monthday: string; month: string; window: string;
  enabled: boolean; permission: "Ask" | "Auto" | "YOLO"; sessionPolicy: "new" | "reuse";
  push: boolean; pushChannelId?: string; tz: string;
  lastRun?: string; lastResult?: "success" | "failed" | "running" | "none"; nextRun: string;
  reuseSessionId?: string; generatedSessionIds: string[];
}

/* ============ 初始项目 ============ */
const initialProjects: Project[] = [
  { id: "p1", name: "rill-web", path: "~/work/rill/rill-web", branch: "feat/workbench-ui", status: "ok", expanded: true },
  { id: "p2", name: "rillagent-cli", path: "~/work/rill/rillagent-cli", branch: "main", status: "ok", expanded: true },
];

export function projectName(projectList: readonly Project[], id: string) {
  if (id === "global" || id === "全局") return "全局";
  return projectList.find((project) => project.id === id)?.name ?? "项目不可用";
}
// 兼容旧引用：导出静态 projects（只读快照，仅用于文案）
export const projects = initialProjects;

const defaultSettings: SessionSettings = { model: "Opus 4.8", reasoning: "高", exec: "自动", collab: "结对", permission: "需确认" };
const emptyCtx = (limit = 200000): SessionContext => ({ used: 0, limit, rounds: 0, roundTokens: 0, cacheHit: 0, cacheMiss: 0, roundCost: 0, totalCost: 0, currency: "USD", balance: 42.5, refreshedAt: "刚刚" });
let entityIDSequence = 0;
function stableEntityID(prefix: string) {
  entityIDSequence += 1;
  const random = globalThis.crypto?.randomUUID?.().replaceAll("-", "") ?? `${Date.now().toString(36)}${entityIDSequence.toString(36)}`;
  return `${prefix}-${random}`;
}

/* ============ 初始会话（每个会话内容各不相同） ============ */
const S: Session[] = [
  {
    id: "s1", title: "重构主工作台三栏布局", summary: "拆分左侧会话、中间对话、右侧上下文，并隔离每会话草稿。",
    projectId: "p1", source: "local", runState: "aiRunning", updatedAt: "刚刚", createdAt: "今天 09:12",
    draft: "", attachments: [], refs: [{ id: "rf1", kind: "file", label: "App.tsx" }, { id: "rf2", kind: "file", label: "Sidebar.tsx" }],
    settings: { ...defaultSettings },
    context: { used: 124000, limit: 200000, rounds: 34, roundTokens: 3200, cacheHit: 86000, cacheMiss: 38000, roundCost: 0.42, totalCost: 6.18, currency: "USD", balance: 42.5, refreshedAt: "刚刚" },
    messages: [
      { id: "m1", type: "notice", tone: "bg-slate-100 text-slate-500", text: "会话开始于 今天 09:12 · 协作模式：结对 · 工具权限：需确认" },
      { id: "m2", type: "user", text: "帮我把主工作台改成三栏布局：左侧项目会话、中间对话、右侧上下文。切换会话时不要串草稿。", refs: ["App.tsx", "Sidebar.tsx"] },
      { id: "m3", type: "reasoning", thought: "需要为每个会话维护独立的输入草稿与运行状态；切换会话时读取该会话自己的草稿，避免跨会话污染。" },
      { id: "m4", type: "ai", text: "好的，我先把左侧会话列表与草稿状态解耦，再实现右侧上下文面板。下面是执行过程与验证结果。" },
      { id: "m5", type: "tool", tool: "run_shell", cmd: "pnpm test src/workbench", ok: true, out: "✓ Sidebar renders 5 sessions\n✓ draft isolated per session\nTests: 12 passed, 0 failed (2.4s)" },
      { id: "m6", type: "code", file: "src/app/components/workbench/Sidebar.tsx", added: 128, removed: 14, codeLines: [{ t: "+ const [draft, setDraft] = useState(session.draft);", kind: "add" }, { t: "  return (", kind: "ctx" }, { t: '    <aside className="w-[288px]">', kind: "ctx" }] },
      { id: "m7", type: "tasklist", tasks: [{ t: "拆分左侧 Sidebar 组件", state: "done" }, { t: "抽离会话草稿状态", state: "done" }, { t: "实现右侧上下文面板", state: "running" }, { t: "补充只读会话保护逻辑", state: "todo" }] },
    ],
  },
  {
    id: "s2", title: "修复会话切换时草稿串号问题", summary: "切换会话时读取该会话自己的草稿，避免跨会话污染。",
    projectId: "p1", source: "local", runState: "awaitingConfirm", updatedAt: "12 分钟前", createdAt: "今天 11:40", unread: 2,
    draft: "还需要给回收站也加上多选批量删除", attachments: [{ id: "a1", name: "repro.png", kind: "image", size: "88 KB" }], refs: [{ id: "rf3", kind: "file", label: "store.tsx" }],
    settings: { model: "Sonnet 4.6", reasoning: "中", exec: "自动", collab: "监督", permission: "需确认" },
    context: { used: 41000, limit: 200000, rounds: 12, roundTokens: 1800, cacheHit: 22000, cacheMiss: 19000, roundCost: 0.11, totalCost: 1.42, currency: "USD", balance: 42.5, refreshedAt: "12 分钟前" },
    pendingConfirm: { op: "强制推送分支", command: "git push --force origin feat/workbench-ui", scope: "rill-web 远端仓库", workdir: "~/work/rill/rill-web", risk: "会覆盖远端历史，超出当前权限边界，不可自动回滚。" },
    messages: [
      { id: "n1", type: "notice", tone: "bg-slate-100 text-slate-500", text: "会话开始于 今天 11:40 · 协作模式：监督 · 工具权限：需确认" },
      { id: "n2", type: "user", text: "切换会话时草稿会串到别的会话，帮我复现并修一下。", refs: ["store.tsx"] },
      { id: "n3", type: "ai", text: "我复现了：草稿此前挂在公共 state 上。已改为每个会话独立保存。下面这一步需要你确认。" },
    ],
  },
  {
    id: "s3", title: "接入飞书渠道自动回复", summary: "把 dev-rill 群消息路由到 rill-web 项目会话。",
    projectId: "p1", source: "bot", sourceDetail: "飞书/Lark · dev-rill 群机器人 · dev-rill 群", channelId: "ch1", runState: "idle", updatedAt: "1 小时前", createdAt: "今天 08:30",
    draft: "", attachments: [], refs: [],
    settings: { model: "Opus 4.8", reasoning: "中", exec: "自动", collab: "自动", permission: "自动" },
    context: { used: 22000, limit: 200000, rounds: 8, roundTokens: 900, cacheHit: 12000, cacheMiss: 10000, roundCost: 0.06, totalCost: 0.51, currency: "USD", balance: 42.5, refreshedAt: "1 小时前" },
    messages: [
      { id: "b1", type: "notice", tone: "bg-violet-50 text-violet-500", text: "来自飞书 · dev-rill 群 · 由 @张工 触发" },
      { id: "b2", type: "user", text: "@Rill 帮我看下今天构建为什么失败了" },
      { id: "b3", type: "ai", text: "我查看了最近一次构建日志，失败原因是 lockfile 未更新。已给出修复建议并回帖到群里。" },
      { id: "b4", type: "output", tool: "read_log", cmd: "tail -n 40 build.log", ok: true, out: "ERR pnpm-lock.yaml is out of date\n  run `pnpm install` to update" },
    ],
  },
  {
    id: "s4", title: "每日构建产物巡检", summary: "由自动化任务生成，检查产物完整性并汇报。",
    projectId: "p1", source: "schedule", sourceDetail: "自动化任务：每日构建产物巡检 · 最近执行 今天 08:00", scheduleTaskId: "t1", runState: "success", updatedAt: "今天 08:00", createdAt: "今天 08:00",
    draft: "", attachments: [], refs: [],
    settings: { model: "Haiku 4.5", reasoning: "低", exec: "自动", collab: "自动", permission: "自动" },
    context: { used: 9000, limit: 200000, rounds: 5, roundTokens: 400, cacheHit: 5000, cacheMiss: 4000, roundCost: 0.01, totalCost: 0.08, currency: "USD", balance: 42.5, refreshedAt: "今天 08:00" },
    messages: [
      { id: "c1", type: "notice", tone: "bg-amber-50 text-amber-600", text: "由自动化任务「每日构建产物巡检」于 今天 08:00 触发" },
      { id: "c2", type: "ai", text: "巡检完成：3 个产物全部存在且校验通过，无异常。" },
      { id: "c3", type: "tasklist", tasks: [{ t: "检查 dist 产物完整性", state: "done" }, { t: "校验 sha256", state: "done" }, { t: "汇报结果", state: "done" }] },
    ],
  },
  {
    id: "s5", title: "旧版设计评审记录", summary: "评审归档，仅供查阅，不可继续编辑。",
    projectId: "p1", source: "local", runState: "readonly", updatedAt: "3 天前", createdAt: "3 天前",
    draft: "", attachments: [], refs: [],
    settings: { ...defaultSettings },
    context: { used: 68000, limit: 200000, rounds: 21, roundTokens: 0, cacheHit: null, cacheMiss: null, roundCost: null, totalCost: 2.1, currency: "USD", balance: null, refreshedAt: "3 天前" },
    messages: [
      { id: "d1", type: "notice", tone: "bg-slate-100 text-slate-500", text: "只读归档会话 · 记录于 3 天前" },
      { id: "d2", type: "user", text: "评审一下旧版三栏方案的取舍。" },
      { id: "d3", type: "ai", text: "旧版把上下文与文件混在一个面板，信息密度过高；建议拆分。（本会话为归档记录，不可继续编辑）" },
    ],
  },
  {
    id: "s6", title: "补全 slash 命令帮助文档", summary: "为 Rillagent CLI 补充 slash 命令说明。",
    projectId: "p2", source: "local", runState: "idle", updatedAt: "昨天", createdAt: "昨天",
    draft: "记得补充 /rillagent-guide 的示例", attachments: [], refs: [{ id: "rf6", kind: "file", label: "docs/commands.md" }],
    settings: { model: "Sonnet 4.6", reasoning: "中", exec: "手动", collab: "结对", permission: "需确认" },
    context: { used: 31000, limit: 200000, rounds: 9, roundTokens: 1200, cacheHit: 18000, cacheMiss: 13000, roundCost: 0.09, totalCost: 0.77, currency: "USD", balance: 42.5, refreshedAt: "昨天" },
    messages: [
      { id: "e1", type: "notice", tone: "bg-slate-100 text-slate-500", text: "会话开始于 昨天 · 协作模式：结对" },
      { id: "e2", type: "user", text: "给 Rillagent 的 slash 命令写一份帮助文档。", refs: ["docs/commands.md"] },
      { id: "e3", type: "ai", text: "已列出全部 slash 命令并补充示例，文档已生成在 docs/commands.md。" },
    ],
  },
  {
    id: "s7", title: "发布流水线权限收敛", summary: "定时巡检发布权限，收敛高权限入口。",
    projectId: "p2", source: "schedule", sourceDetail: "自动化任务：发布权限巡检 · 最近执行 2 天前", scheduleTaskId: "t2", runState: "failed", updatedAt: "2 天前", createdAt: "2 天前",
    draft: "", attachments: [], refs: [],
    settings: { model: "Opus 4.8", reasoning: "高", exec: "自动", collab: "自动", permission: "需确认" },
    context: { used: 15000, limit: 200000, rounds: 4, roundTokens: 700, cacheHit: 8000, cacheMiss: 7000, roundCost: 0.03, totalCost: 0.19, currency: "USD", balance: 42.5, refreshedAt: "2 天前" },
    error: "connect ETIMEDOUT — 发布网关在 30s 内未响应。",
    messages: [
      { id: "f1", type: "notice", tone: "bg-amber-50 text-amber-600", text: "由自动化任务「发布权限巡检」于 2 天前触发" },
      { id: "f2", type: "ai", text: "开始巡检发布权限入口……" },
      { id: "f3", type: "error", text: "connect ETIMEDOUT — 发布网关在 30s 内未响应。上下文已保留，可重试。" },
    ],
  },
];

/* ============ 回收站 ============ */
const R: Recycled[] = [
  { id: "r1", title: "试验性 Tailwind 主题切换", summary: "尝试暗色主题变量，未采用。", projectId: "p1", source: "local", deletedAt: "昨天 15:20", snapshot: mkArchive("r1", "试验性 Tailwind 主题切换", "尝试暗色主题变量，未采用。", "p1") },
  { id: "r2", title: "废弃的登录页原型", summary: "早期原型，需求变更后弃用。", projectId: "p2", source: "local", deletedAt: "2 天前 10:02", snapshot: mkArchive("r2", "废弃的登录页原型", "早期原型，需求变更后弃用。", "p2") },
  { id: "r3", title: "重复的巡检会话", summary: "定时任务误触产生的重复会话。", projectId: "p1", source: "schedule", deletedAt: "3 天前 08:05", restoreCopy: true, snapshot: mkArchive("r3", "重复的巡检会话", "定时任务误触产生的重复会话。", "p1") },
];
function mkArchive(id: string, title: string, summary: string, projectId: string): Session {
  return {
    id, title, summary, projectId, source: "local", runState: "readonly", updatedAt: "已删除", createdAt: "—",
    draft: "", attachments: [], refs: [], settings: { ...defaultSettings }, context: emptyCtx(),
    messages: [{ id: id + "_a", type: "notice", tone: "bg-slate-100 text-slate-500", text: "已删除会话的归档记录" }, { id: id + "_b", type: "user", text: `（${title}）的历史提问` }, { id: id + "_c", type: "ai", text: summary }],
  };
}

/* ============ 文件树（按项目） ============ */
const filesByProject: Record<string, FileNode[]> = {
  p1: [
    { path: "src/app/App.tsx", name: "App.tsx", type: "file", kind: "text", content: 'import { StoreProvider } from "./components/workbench/store";\n\nexport default function App() {\n  return <StoreProvider><Router /></StoreProvider>;\n}' },
    { path: "src/app/components/workbench/Sidebar.tsx", name: "Sidebar.tsx", type: "file", kind: "text", content: 'export function Sidebar() {\n  const { projects, sessions } = useStore();\n  return <aside className="w-[288px]">{/* ... */}</aside>;\n}' },
    { path: "src/app/components/workbench/store.tsx", name: "store.tsx", type: "file", kind: "text", content: '// 统一数据状态：每个会话独立保存草稿、附件、消息与运行状态\nexport function StoreProvider() { /* ... */ }' },
    { path: "public/logo.png", name: "logo.png", type: "file", kind: "binary" },
    { path: "src/styles/empty.css", name: "empty.css", type: "file", kind: "empty" },
    { path: "src/data/huge-fixture.json", name: "huge-fixture.json", type: "file", kind: "text", large: true, content: "{ /* 12MB 大文件，默认不注入完整内容 */ }" },
  ],
  p2: [
    { path: "src/cli.ts", name: "cli.ts", type: "file", kind: "text", content: 'import { run } from "./run";\n\nrun(process.argv.slice(2));' },
    { path: "docs/commands.md", name: "commands.md", type: "file", kind: "text", content: "# Rillagent 命令\n\n- /rillagent-guide 使用向导\n- /commit-msg 生成提交信息" },
    { path: "src/bin/broken.lock", name: "broken.lock", type: "file", kind: "unreadable" },
  ],
};

/* ============ Git 改动（按项目） ============ */
const diffsByProject: Record<string, DiffFile[]> = {
  p1: [
    { path: "src/app/components/workbench/Sidebar.tsx", status: "added", added: 128, removed: 0, aiNote: "新增左侧会话列表组件，草稿状态下沉到每个会话。", hunks: [{ lines: [{ t: "+export function Sidebar() {", kind: "add" }, { t: "+  const { sessions } = useStore();", kind: "add" }, { t: "+  return <aside />;", kind: "add" }, { t: "+}", kind: "add" }] }] },
    { path: "src/app/App.tsx", status: "modified", added: 42, removed: 18, aiNote: "接入 StoreProvider，移除公共草稿 state。", hunks: [{ lines: [{ t: "-  const [draft, setDraft] = useState('');", kind: "del" }, { t: "+  // 草稿改为按会话保存", kind: "add" }, { t: "   return (", kind: "ctx" }, { t: "     <StoreProvider>", kind: "ctx" }] }] },
    { path: "src/legacy/OldPanel.tsx", status: "deleted", added: 0, removed: 210, aiNote: "删除旧的混合面板。", hunks: [{ lines: [{ t: "-export function OldPanel() { /* 旧混合面板 */ }", kind: "del" }] }] },
    { path: "src/app/components/workbench/Panel.tsx", status: "renamed", oldPath: "src/app/components/workbench/RightPanel.tsx", added: 4, removed: 4, aiNote: "重命名以匹配新结构。", hunks: [{ lines: [{ t: "  // 内容保持不变，仅重命名", kind: "ctx" }] }] },
    { path: "public/logo.png", status: "binary", added: 0, removed: 0, aiNote: "替换了品牌图标（二进制，无文本 Diff）。" },
    { path: "notes.todo", status: "untracked", added: 3, removed: 0, aiNote: "未跟踪的临时笔记。", hunks: [{ lines: [{ t: "+ TODO: 补充只读会话测试", kind: "add" }, { t: "+ TODO: 回收站批量删除", kind: "add" }, { t: "+ TODO: 自动化 YOLO 风险确认", kind: "add" }] }] },
  ],
  p2: [
    { path: "docs/commands.md", status: "modified", added: 22, removed: 2, aiNote: "补全 slash 命令说明与示例。", hunks: [{ lines: [{ t: "+- /rillagent-guide 使用向导", kind: "add" }, { t: "+- /commit-msg 生成提交信息", kind: "add" }, { t: " # Rillagent 命令", kind: "ctx" }] }] },
  ],
};

/* ============ 渠道 ============ */
const initialChannels: Channel[] = [
  { id: "ch1", type: "飞书/Lark", name: "dev-rill 群机器人", connState: "connected", hasAssociation: true, remoteId: "oc_9f2a…dev", scope: "rill-web", projectId: "p1", policy: "trusted", whitelistOn: true, userHit: true, users: ["张工", "李工"], groups: ["dev-rill 群"], lastSync: "2 分钟前", sessionIds: ["s3"] },
  { id: "ch2", type: "QQ", name: "QQ 客服助手", connState: "credExpired", hasAssociation: false, remoteId: "qq_1088…svc", scope: "全局", policy: "everyone", whitelistOn: false, userHit: false, users: [], groups: [], lastSync: "失败", sessionIds: [] },
];

/* ============ 自动化任务 ============ */
const initialTasks: AutomationTask[] = [
  { id: "t1", name: "每日构建产物巡检", prompt: "检查最新构建产物是否完整，并汇报异常。", scope: "p1", freqType: "daily", intervalVal: 1, intervalUnit: "小时", time: "08:00", weekday: "周一", monthday: "1", month: "1 月", window: "±10 分钟", enabled: true, permission: "Auto", sessionPolicy: "new", push: true, pushChannelId: "ch1", tz: "UTC+8 (Asia/Shanghai)", lastRun: "今天 08:00", lastResult: "success", nextRun: "明天 08:00", generatedSessionIds: ["s4"] },
  { id: "t2", name: "发布权限巡检", prompt: "巡检发布流水线的高权限入口并收敛。", scope: "p2", freqType: "weekly", intervalVal: 1, intervalUnit: "小时", time: "20:00", weekday: "周五", monthday: "1", month: "1 月", window: "±5 分钟", enabled: false, permission: "Ask", sessionPolicy: "reuse", push: false, tz: "UTC+8 (Asia/Shanghai)", lastRun: "2 天前", lastResult: "failed", nextRun: "已停用", reuseSessionId: "s7", generatedSessionIds: ["s7"] },
];

/* ============================================================ */

export interface Store {
  route: Route;
  params: Record<string, string>;
  navigate: (route: Route, params?: Record<string, string>) => void;

  projects: Project[];
  addProject: (p: Omit<Project, "id" | "expanded" | "status">) => void;
  renameProject: (id: string, name: string) => void;
  addIsolatedWorkspace: (fromId: string, branch: string, dir: string) => void;
  createIsolatedWorkspace: (projectId: string) => Promise<boolean>;
  toggleProject: (id: string) => void;

  sessions: Session[];
  recycled: Recycled[];
  channels: Channel[];
  tasks: AutomationTask[];
  slashCommands: CommandInfo[];
  refreshSlashCommands: () => Promise<void>;

  activeSessionId: string;
  active: Session;
  setActiveSession: (id: string) => void;

  // 会话
  createSession: (projectId: string) => Promise<string | null>;
  renameSession: (id: string, title: string) => Promise<boolean>;
  closeSession: (id: string) => Promise<boolean>;
  deleteSession: (id: string) => void; // 移入回收站
  openSession: (id: string) => void;

  // 会话内编辑（按会话）
  updateSession: (id: string, patch: Partial<Session>) => void;
  setDraft: (id: string, draft: string) => void;
  addAttachment: (id: string, a: Attachment) => void;
  removeAttachment: (id: string, aid: string) => void;
  addRef: (id: string, ref: Ref) => void;
  removeRef: (id: string, rid: string) => void;
  setSetting: (id: string, key: keyof SessionSettings, value: string) => void;
  sendMessage: (id: string) => Promise<boolean>;
  stopRun: (id: string) => void;
  resolveConfirm: (id: string, allow: boolean) => void;
  answerQuestion: (id: string, answer: string) => void;
  retry: (id: string, switchModel?: boolean) => void;
  clearContext: (id: string) => void;

  // 回收站
  restoreFromRecycle: (id: string) => void;
  permanentDelete: (id: string) => void;
  emptyRecycle: () => void;
  cleanRestoreCopies: () => void;

  // 渠道
  updateChannel: (id: string, patch: Partial<Channel>) => void;

  // 自动化
  saveTask: (t: AutomationTask) => AutomationTask;
  deleteTask: (id: string) => void;
  runTaskNow: (id: string) => void;
  toggleTask: (id: string) => void;

  // 文件 / 改动（当前项目）
  filesOf: (projectId: string) => FileNode[];
  diffsOf: (projectId: string) => DiffFile[];
  refreshFiles: (projectId: string) => Promise<void>;
  readFile: (projectId: string, path: string) => Promise<FileNode | null>;
  refreshDiffs: (projectId: string) => Promise<void>;
  readDiff: (projectId: string, path: string) => Promise<DiffFile | null>;
  refreshContext: (sessionId: string) => Promise<void>;

  // 把内容加入某会话输入区引用
  addRefToActive: (ref: Ref) => void;
}

const Ctx = createContext<Store | null>(null);

export interface VisualStoreSeed {
  readonly route?: Route;
  readonly params?: Record<string, string>;
  readonly projects?: readonly Project[];
  readonly sessions?: readonly Session[];
  readonly activeSessionId?: string;
  readonly activeSessionPatch?: Partial<Session>;
}

export interface RillSessionRuntime {
  submit: (session: Session, input: string) => Promise<void>;
  steer: (session: Session, input: string) => Promise<void>;
  activate?: (session: Session) => Promise<void>;
  create?: (projectId: string) => Promise<Session | null>;
  createIsolated?: (project: Project) => Promise<{ project: Project; session: Session }>;
  rename?: (session: Session, title: string) => Promise<void>;
  close?: (session: Session) => Promise<void>;
  commands?: () => Promise<CommandInfo[]>;
  cancel?: (session: Session) => Promise<void>;
  approve?: (session: Session, allow: boolean) => Promise<void>;
  answer?: (session: Session, answer: string) => Promise<void>;
  clearContext?: (session: Session) => Promise<void>;
  listFiles?: (session: Session) => Promise<FileNode[]>;
  readFile?: (session: Session, path: string) => Promise<FileNode>;
  listDiffs?: (session: Session) => Promise<DiffFile[]>;
  readDiff?: (session: Session, file: DiffFile) => Promise<DiffFile>;
  refreshContext?: (session: Session) => Promise<SessionContext>;
}

function sessionsFromSeed(seed: VisualStoreSeed): Session[] {
  const source = seed.sessions ? [...seed.sessions] : S;
  if (!seed.activeSessionPatch || !seed.activeSessionId) return source;
  return source.map((session) => session.id === seed.activeSessionId ? { ...session, ...seed.activeSessionPatch } : session);
}

function mergeLiveSessions(current: readonly Session[], incoming: readonly Session[]) {
  return incoming.map((session) => {
    const local = current.find((candidate) => candidate.id === session.id);
    if (!local) return session;
    return {
      ...session,
      draft: local.draft,
      attachments: local.attachments,
      refs: local.refs,
      modelContextClearedAt: session.modelContextClearedAt ?? local.modelContextClearedAt,
    };
  });
}

export function StoreProvider({
  children,
  seed = {},
  runtime,
}: {
  children: ReactNode;
  seed?: VisualStoreSeed;
  runtime?: RillSessionRuntime;
}) {
  const [nav, setNav] = useState<{ route: Route; params: Record<string, string> }>({
    route: seed.route ?? "workbench",
    params: seed.params ?? {},
  });
  const [projectList, setProjectList] = useState<Project[]>(() => seed.projects ? [...seed.projects] : initialProjects);
  const [sessions, setSessions] = useState<Session[]>(() => sessionsFromSeed(seed));
  const [recycled, setRecycled] = useState<Recycled[]>(R);
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [tasks, setTasks] = useState<AutomationTask[]>(initialTasks);
  const [slashCommands, setSlashCommands] = useState<CommandInfo[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<Record<string, FileNode[]>>(filesByProject);
  const [workspaceDiffs, setWorkspaceDiffs] = useState<Record<string, DiffFile[]>>(diffsByProject);
  const [activeSessionId, setActiveSessionId] = useState(seed.activeSessionId ?? "s1");
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  useEffect(() => {
    if (!seed.projects) return;
    setProjectList((current) => seed.projects!.map((project) => ({
      ...project,
      expanded: current.find((candidate) => candidate.id === project.id)?.expanded ?? project.expanded,
    })));
  }, [seed.projects]);

  useEffect(() => {
    if (!seed.sessions) return;
    setSessions((current) => mergeLiveSessions(current, seed.sessions!));
    const next = seed.activeSessionId;
    if (next && seed.sessions.some((session) => session.id === next)) setActiveSessionId(next);
  }, [seed.sessions]);

  useEffect(() => {
    const next = seed.activeSessionId;
    if (next && sessions.some((session) => session.id === next)) setActiveSessionId(next);
  }, [seed.activeSessionId]);

  const patch = (id: string, p: Partial<Session>) => setSessions((ss) => ss.map((s) => s.id === id ? { ...s, ...p } : s));

  const value = useMemo<Store>(() => {
    const active = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
    const sessionForProject = (projectId: string) =>
      (active?.projectId === projectId ? active : sessions.find((session) => session.projectId === projectId));
    return {
      route: nav.route,
      params: nav.params,
      navigate: (route, params = {}) => setNav({ route, params }),

      projects: projectList,
      addProject: (p) => { const id = `p${Date.now()}`; setProjectList((ps) => [...ps, { ...p, id, status: "ok", expanded: true }]); toast.success(`已添加项目「${p.name}」`); },
      renameProject: (id, name) => setProjectList((ps) => ps.map((project) => project.id === id ? { ...project, name } : project)),
      addIsolatedWorkspace: (fromId, branch, dir) => {
        const src = projectList.find((p) => p.id === fromId);
        const id = `p${Date.now()}`;
        setProjectList((ps) => [...ps, { id, name: `${src?.name ?? "项目"}·隔离`, path: dir, branch, status: "ok", expanded: true, isolated: { from: fromId } }]);
        toast.success("已创建隔离交付工作区", { description: `来源 ${src?.name} · 分支 ${branch}` });
      },
      createIsolatedWorkspace: async (projectId) => {
        const project = projectList.find((candidate) => candidate.id === projectId);
        if (!project || project.status !== "ok" || !runtime?.createIsolated) {
          toast.error("无法创建隔离工作区", { description: project ? "当前环境不支持隔离创建" : "项目已不可用" });
          return false;
        }
        try {
          const created = await runtime.createIsolated(project);
          setProjectList((current) => [created.project, ...current.filter((candidate) => candidate.id !== created.project.id)]);
          setSessions((current) => [created.session, ...current.filter((candidate) => candidate.id !== created.session.id)]);
          setActiveSessionId(created.session.id);
          setNav({ route: "workbench", params: {} });
          toast.success("已创建隔离交付工作区", { description: `${created.project.name} · ${created.project.branch}` });
          return true;
        } catch (error) {
          toast.error("隔离工作区创建失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          return false;
        }
      },
      toggleProject: (id) => setProjectList((ps) => ps.map((p) => p.id === id ? { ...p, expanded: !p.expanded } : p)),

      sessions, recycled, channels, tasks,
      slashCommands,
      refreshSlashCommands: async () => {
        if (!runtime?.commands) return;
        try {
          setSlashCommands(await runtime.commands());
        } catch (error) {
          toast.error("斜杠命令读取失败", { description: error instanceof Error ? error.message : "请稍后重试" });
        }
      },
      activeSessionId, active,
      setActiveSession: (id) => {
        const target = sessions.find((session) => session.id === id);
        if (!target) return;
        const previous = activeSessionId;
        setActiveSessionId(id);
        if (runtime?.activate) {
          void runtime.activate(target).catch((error) => {
            setActiveSessionId(previous);
            toast.error("无法切换会话", { description: error instanceof Error ? error.message : "请稍后重试" });
          });
        }
      },

      createSession: async (projectId) => {
        const project = projectList.find((candidate) => candidate.id === projectId);
        if (!project || project.status !== "ok") {
          toast.error("无法新建会话", {
            description: project ? `项目「${project.name}」当前不可用` : "当前项目已不存在",
          });
          return null;
        }
        if (runtime?.create) {
          try {
            const created = await runtime.create(projectId);
            if (!created) return null;
            setSessions((current) => [created, ...current.filter((session) => session.id !== created.id)]);
            setActiveSessionId(created.id);
            setNav({ route: "workbench", params: {} });
            return created.id;
          } catch (error) {
            toast.error("无法新建会话", { description: error instanceof Error ? error.message : "请稍后重试" });
            return null;
          }
        }
        const id = `s${Date.now()}`;
        const ns: Session = {
          id, title: "新会话", summary: "空会话，尚未开始对话。", projectId, source: "local",
          runState: "empty", updatedAt: "刚刚", createdAt: "刚刚", draft: "", attachments: [], refs: [],
          messages: [], settings: { ...defaultSettings }, context: emptyCtx(),
        };
        setSessions((ss) => [ns, ...ss]);
        setActiveSessionId(id);
        setNav({ route: "workbench", params: {} });
        return id;
      },
      renameSession: async (id, title) => {
        const session = sessions.find((candidate) => candidate.id === id);
        const trimmed = title.trim();
        if (!session || !trimmed) return false;
        try {
          if (runtime?.rename) await runtime.rename(session, trimmed);
          patch(id, { title: trimmed });
          toast.success("已重命名会话");
          return true;
        } catch (error) {
          toast.error("会话重命名失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          return false;
        }
      },
      closeSession: async (id) => {
        const session = sessions.find((candidate) => candidate.id === id);
        if (!session) return false;
        try {
          if (runtime?.close) await runtime.close(session);
          const remaining = sessions.filter((candidate) => candidate.id !== id);
          setSessions(remaining);
          if (activeSessionId === id && remaining[0]) setActiveSessionId(remaining[0].id);
          toast("已关闭会话", { description: "历史记录仍保留" });
          return true;
        } catch (error) {
          toast.error("会话关闭失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          return false;
        }
      },
      deleteSession: (id) => {
        const s = sessions.find((x) => x.id === id);
        if (!s) return;
        setSessions((prev) => prev.filter((x) => x.id !== id));
        setRecycled((r) => [{ id: s.id, title: s.title, summary: s.summary, projectId: s.projectId, source: s.source, deletedAt: "刚刚", snapshot: s }, ...r]);
        if (activeSessionId === id) { const rest = sessions.filter((x) => x.id !== id); if (rest[0]) setActiveSessionId(rest[0].id); }
        toast("已移入回收站", { description: `「${s.title}」可在回收站恢复` });
      },
      openSession: (id) => {
        setActiveSessionId(id);
        setNav({ route: "workbench", params: {} });
        const s = sessions.find((x) => x.id === id);
        toast.success(`已在主工作台打开「${s?.title ?? id}」`);
      },

      updateSession: patch,
      setDraft: (id, draft) => patch(id, { draft }),
      addAttachment: (id, a) => setSessions((ss) => ss.map((s) => s.id === id ? { ...s, attachments: [...s.attachments, a] } : s)),
      removeAttachment: (id, aid) => setSessions((ss) => ss.map((s) => s.id === id ? { ...s, attachments: s.attachments.filter((x) => x.id !== aid) } : s)),
      addRef: (id, ref) => setSessions((ss) => ss.map((s) => s.id === id ? { ...s, refs: [...s.refs.filter((r) => r.label !== ref.label || r.kind !== ref.kind), ref] } : s)),
      removeRef: (id, rid) => setSessions((ss) => ss.map((s) => s.id === id ? { ...s, refs: s.refs.filter((x) => x.id !== rid) } : s)),
      setSetting: (id, key, val) => setSessions((ss) => ss.map((s) => s.id === id ? { ...s, settings: { ...s.settings, [key]: val } } : s)),

      sendMessage: async (id) => {
        const s = sessions.find((x) => x.id === id);
        const input = s?.draft.trim() ?? "";
        if (!s || !input) return false;
        const supplement = s.runState === "aiRunning";

        if (runtime) {
          try {
            if (supplement) await runtime.steer(s, input);
            else await runtime.submit(s, input);
          } catch (error) {
            toast.error(supplement ? "补充指令发送失败" : "消息发送失败", {
              description: error instanceof Error ? error.message : "请稍后重试",
            });
            return false;
          }
          setSessions((ss) => ss.map((x) => x.id === id && x.draft.trim() === input ? {
            ...x,
            draft: "",
            refs: [],
            attachments: [],
            updatedAt: "刚刚",
            modelContextClearedAt: undefined,
          } : x));
          return true;
        }

        const um: Message = { id: `u${Date.now()}`, type: "user", text: input, refs: s.refs.map((r) => r.label) };
        if (supplement) {
          setSessions((ss) => ss.map((x) => x.id === id ? {
            ...x,
            draft: "",
            refs: [],
            attachments: [],
            updatedAt: "刚刚",
            modelContextClearedAt: undefined,
            messages: [...x.messages, um],
          } : x));
          toast.success("已发送补充指令");
          return true;
        }

        const am: Message = { id: `a${Date.now() + 1}`, type: "ai", text: "收到，我开始处理。（演示：稍后返回结果）" };
        setSessions((ss) => ss.map((x) => x.id === id ? {
          ...x, draft: "", refs: [], attachments: [], runState: "aiRunning", updatedAt: "刚刚", modelContextClearedAt: undefined,
          messages: [...x.messages, um, am],
          context: { ...x.context, rounds: x.context.rounds + 1, used: Math.min(x.context.limit, x.context.used + 1500) },
        } : x));
        // 演示：短暂后进入成功
        setTimeout(() => patch(id, { runState: "idle" }), 1200);
        return true;
      },
      stopRun: (id) => {
        const session = sessions.find((candidate) => candidate.id === id);
        if (session && runtime?.cancel) {
          void runtime.cancel(session).catch((error) => {
            toast.error("停止运行失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          });
          return;
        }
        patch(id, { runState: "idle" });
        toast("已停止运行");
      },
      resolveConfirm: (id, allow) => {
        const s = sessions.find((x) => x.id === id);
        if (!s?.pendingConfirm) return;
        if (runtime?.approve) {
          void runtime.approve(s, allow).catch((error) => {
            toast.error("确认操作失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          });
          return;
        }
        const note: Message = { id: `cf${Date.now()}`, type: allow ? "notice" : "error", tone: allow ? "bg-emerald-50 text-emerald-600" : undefined, text: allow ? `已允许并执行：${s.pendingConfirm.op}` : `已拒绝执行：${s.pendingConfirm.op}，任务已停止。` };
        patch(id, { pendingConfirm: undefined, runState: allow ? "success" : "idle", messages: [...s.messages, note] });
        toast[allow ? "success" : "message"](allow ? "已允许执行" : "已拒绝执行");
      },
      answerQuestion: (id, answer) => {
        const s = sessions.find((x) => x.id === id);
        if (!s?.pendingQuestion) return;
        if (runtime?.answer) {
          void runtime.answer(s, answer).catch((error) => {
            toast.error("回答发送失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          });
          return;
        }
        const um: Message = { id: `qa${Date.now()}`, type: "answered", text: answer };
        patch(id, { pendingQuestion: undefined, runState: "aiRunning", messages: [...s.messages, um] });
        setTimeout(() => patch(id, { runState: "idle" }), 1000);
        toast.success("已回答，继续执行");
      },
      retry: (id, switchModel) => {
        const s = sessions.find((x) => x.id === id);
        if (!s) return;
        if (switchModel) patch(id, { settings: { ...s.settings, model: s.settings.model === "Opus 4.8" ? "Sonnet 4.6" : "Opus 4.8" } });
        patch(id, { runState: "aiRunning", error: undefined });
        setTimeout(() => patch(id, { runState: "idle" }), 1200);
        toast(switchModel ? "已切换模型并重试" : "正在重试");
      },
      clearContext: (id) => {
        const s = sessions.find((x) => x.id === id);
        if (!s) return;
        if (runtime?.clearContext) {
          void runtime.clearContext(s).then(() => {
            patch(id, { context: { ...s.context, used: 0, rounds: 0, roundTokens: 0 }, modelContextClearedAt: "刚刚" });
            toast.success("已清空当前上下文", { description: "历史记录中的原始会话仍然保留" });
          }).catch((error) => {
            toast.error("清空上下文失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          });
          return;
        }
        patch(id, { context: { ...s.context, used: 0, rounds: 0, roundTokens: 0 }, modelContextClearedAt: "刚刚" });
        toast.success("已清空当前上下文", { description: "历史记录中的原始会话仍然保留" });
      },

      restoreFromRecycle: (id) => {
        const rec = recycled.find((x) => x.id === id);
        if (!rec) return;
        setRecycled((r) => r.filter((x) => x.id !== id));
        setSessions((prev) => [{ ...rec.snapshot, runState: "idle", updatedAt: "刚刚" }, ...prev]);
      },
      permanentDelete: (id) => { const s = recycled.find((x) => x.id === id); setRecycled((r) => r.filter((x) => x.id !== id)); toast.success(`已永久删除「${s?.title}」`); },
      emptyRecycle: () => { const n = recycled.length; setRecycled([]); toast.success(`已清空回收站，永久删除 ${n} 个会话`); },
      cleanRestoreCopies: () => { const n = recycled.filter((r) => r.restoreCopy).length; setRecycled((r) => r.filter((x) => !x.restoreCopy)); toast.success(`已清理 ${n} 个恢复副本`, { description: "不影响已恢复的主会话" }); },

      updateChannel: (id, p) => setChannels((cs) => cs.map((c) => c.id === id ? { ...c, ...p } : c)),

      saveTask: (t) => {
        const saved = t.id === "new" || !t.id.trim()
          ? { ...t, id: stableEntityID("task") }
          : t;
        setTasks((ts) => ts.some((x) => x.id === saved.id) ? ts.map((x) => x.id === saved.id ? saved : x) : [...ts, saved]);
        toast.success("已保存自动化任务");
        return saved;
      },
      deleteTask: (id) => { setTasks((ts) => ts.filter((x) => x.id !== id)); toast.success("已删除任务", { description: "已生成的会话仍然保留" }); },
      toggleTask: (id) => setTasks((ts) => ts.map((t) => t.id === id ? { ...t, enabled: !t.enabled, nextRun: !t.enabled ? "明天 08:00" : "已停用" } : t)),
      runTaskNow: (id) => {
        const t = tasks.find((x) => x.id === id);
        if (!t) return;
        const reused = t.sessionPolicy === "reuse" ? sessions.find((session) => session.id === t.reuseSessionId) : undefined;
        const reusedProject = reused ? projectList.find((project) => project.id === reused.projectId && project.status === "ok") : undefined;
        if (t.sessionPolicy === "reuse" && (!reused || !reusedProject)) {
          setTasks((ts) => ts.map((task) => task.id === id ? { ...task, lastResult: "failed" } : task));
          toast.error("复用会话不可用", { description: "任务未运行，也未创建替代会话" });
          return;
        }
        const runID = stableEntityID("automation-run");
        setTasks((ts) => ts.map((x) => x.id === id ? { ...x, lastResult: "running" } : x));
        if (reused) {
          const started: Message = { id: `${runID}-start`, type: "notice", tone: "bg-amber-50 text-amber-600", text: `自动化任务「${t.name}」开始执行` };
          const progress: Message = { id: `${runID}-progress`, type: "tasklist", tasks: [{ t: t.prompt, state: "running" }] };
          setSessions((ss) => ss.map((session) => session.id === reused.id ? {
            ...session,
            runState: "aiRunning",
            updatedAt: "刚刚",
            messages: [...session.messages, started, progress],
          } : session));
        }
        setTimeout(() => {
          let newSid: string | undefined;
          if (t.sessionPolicy === "new") {
            newSid = `s${Date.now()}`;
            const ns: Session = {
              id: newSid, title: `${t.name} · 手动运行`, summary: "由“立即运行”生成的会话。", projectId: t.scope === "全局" ? projectList[0].id : t.scope,
              source: "schedule", sourceDetail: `自动化任务：${t.name} · 手动运行`, scheduleTaskId: t.id, runState: "success", updatedAt: "刚刚", createdAt: "刚刚",
              draft: "", attachments: [], refs: [], settings: { ...defaultSettings }, context: emptyCtx(),
              messages: [{ id: `rn${Date.now()}`, type: "notice", tone: "bg-amber-50 text-amber-600", text: `由自动化任务「${t.name}」手动触发` }, { id: `rn2${Date.now()}`, type: "ai", text: "任务执行完成（演示）。" }],
            };
            setSessions((ss) => [ns, ...ss]);
          } else if (reused) {
            const target = sessionsRef.current.find((session) => session.id === reused.id);
            if (!target) {
              setTasks((ts) => ts.map((task) => task.id === id ? { ...task, lastResult: "failed", lastRun: "刚刚（失败）" } : task));
              toast.error("复用会话已关闭", { description: "任务已停止，未创建替代会话" });
              return;
            }
            const completed: Message = { id: `${runID}-result`, type: "ai", text: `自动化任务「${t.name}」执行完成（演示）。` };
            setSessions((ss) => ss.map((session) => session.id === reused.id ? {
              ...session,
              runState: "success",
              updatedAt: "刚刚",
              messages: [
                ...session.messages.map((message) => message.id === `${runID}-progress` ? { ...message, tasks: message.tasks?.map((item) => ({ ...item, state: "done" as const })) } : message),
                completed,
              ],
            } : session));
          }
          setTasks((ts) => ts.map((x) => x.id === id ? { ...x, lastResult: "success", lastRun: "刚刚（手动）", generatedSessionIds: newSid ? [newSid, ...x.generatedSessionIds] : x.generatedSessionIds } : x));
          toast.success(`「${t.name}」运行完成`, { description: t.sessionPolicy === "new" ? "已新建会话" : "已追加到复用会话；下次计划时间不变" });
        }, 1400);
        toast("已开始立即运行", { description: "不改变原计划时间" });
      },

      filesOf: (pid) => workspaceFiles[pid] ?? [],
      diffsOf: (pid) => workspaceDiffs[pid] ?? [],
      refreshFiles: async (projectId) => {
        const session = sessionForProject(projectId);
        if (!session || !runtime?.listFiles) return;
        try {
          const files = await runtime.listFiles(session);
          setWorkspaceFiles((current) => ({ ...current, [projectId]: files }));
        } catch (error) {
          toast.error("文件树刷新失败", { description: error instanceof Error ? error.message : "请稍后重试" });
        }
      },
      readFile: async (projectId, path) => {
        const session = sessionForProject(projectId);
        if (!session || !runtime?.readFile) return workspaceFiles[projectId]?.find((file) => file.path === path) ?? null;
        try {
          const file = await runtime.readFile(session, path);
          setWorkspaceFiles((current) => ({
            ...current,
            [projectId]: (current[projectId] ?? []).map((candidate) => candidate.path === path ? file : candidate),
          }));
          return file;
        } catch (error) {
          toast.error("文件读取失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          return null;
        }
      },
      refreshDiffs: async (projectId) => {
        const session = sessionForProject(projectId);
        if (!session || !runtime?.listDiffs) return;
        try {
          const diffs = await runtime.listDiffs(session);
          setWorkspaceDiffs((current) => ({ ...current, [projectId]: diffs }));
        } catch (error) {
          toast.error("改动状态刷新失败", { description: error instanceof Error ? error.message : "请稍后重试" });
        }
      },
      readDiff: async (projectId, path) => {
        const session = sessionForProject(projectId);
        const currentFile = workspaceDiffs[projectId]?.find((file) => file.path === path);
        if (!session || !currentFile || !runtime?.readDiff) return currentFile ?? null;
        try {
          const file = await runtime.readDiff(session, currentFile);
          setWorkspaceDiffs((current) => ({
            ...current,
            [projectId]: (current[projectId] ?? []).map((candidate) => candidate.path === path ? file : candidate),
          }));
          return file;
        } catch (error) {
          toast.error("差异读取失败", { description: error instanceof Error ? error.message : "请稍后重试" });
          return null;
        }
      },
      refreshContext: async (sessionId) => {
        const session = sessions.find((candidate) => candidate.id === sessionId);
        if (!session || !runtime?.refreshContext) return;
        try {
          const context = await runtime.refreshContext(session);
          patch(session.id, { context });
        } catch (error) {
          toast.error("上下文刷新失败", { description: error instanceof Error ? error.message : "请稍后重试" });
        }
      },

      addRefToActive: (ref) => {
        setSessions((ss) => ss.map((s) => s.id === activeSessionId ? { ...s, refs: [...s.refs.filter((r) => r.label !== ref.label || r.kind !== ref.kind), ref] } : s));
        setNav({ route: "workbench", params: {} });
        toast.success("已加入当前会话输入区", { description: ref.label });
      },
    };
  }, [nav, projectList, sessions, recycled, channels, tasks, slashCommands, workspaceFiles, workspaceDiffs, activeSessionId, runtime]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
}

/* 运行状态展示元信息 */
export const runMeta: Record<RunState, { label: string; cls: string; dot?: string }> = {
  empty: { label: "空会话", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  loading: { label: "加载中", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  idle: { label: "可编辑", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  aiRunning: { label: "AI 输出中", cls: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500" },
  awaitingAnswer: { label: "等待回答", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  awaitingConfirm: { label: "等待确认", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  success: { label: "执行成功", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  failed: { label: "执行失败", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  readonly: { label: "只读历史会话", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  safeMode: { label: "安全模式", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  startFailed: { label: "启动失败", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  modelUnavailable: { label: "模型不可用", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};
