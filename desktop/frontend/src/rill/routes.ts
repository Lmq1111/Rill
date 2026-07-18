export const RILL_ROUTE_KEYS = [
  "workbench",
  "channel",
  "history",
  "recycle",
  "automation",
  "context",
  "files",
  "changes",
  "settings-general",
  "settings-model",
  "settings-bot",
  "settings-mcp",
  "settings-skills",
  "settings-subagents",
  "settings-plugins",
  "settings-memory",
  "settings-hooks",
  "settings-diagnostics",
  "settings-keyboard",
  "settings-permissions",
  "settings-sandbox",
  "settings-network",
  "settings-appearance",
  "settings-about-privacy",
] as const;

export type RillRouteKey = (typeof RILL_ROUTE_KEYS)[number];
export type RillVisualState = "default" | "loading" | "empty" | "normal" | string;

export interface RillRouteDefinition {
  readonly key: RillRouteKey;
  readonly label: string;
  readonly figma: "FIGMA_LOCKED";
  readonly brandSubstitution: boolean;
  readonly batch: 1 | 2 | 3;
}

const labels: Record<RillRouteKey, string> = {
  workbench: "主工作台",
  channel: "消息渠道详情",
  history: "历史记录",
  recycle: "回收站",
  automation: "自动化任务",
  context: "上下文概览",
  files: "文件",
  changes: "改动",
  "settings-general": "设置—通用",
  "settings-model": "设置—模型",
  "settings-bot": "设置—机器人",
  "settings-mcp": "设置—MCP与工具",
  "settings-skills": "设置—技能",
  "settings-subagents": "设置—子智能体",
  "settings-plugins": "设置—插件",
  "settings-memory": "设置—记忆",
  "settings-hooks": "设置—Hooks",
  "settings-diagnostics": "设置—诊断",
  "settings-keyboard": "设置—快捷键",
  "settings-permissions": "设置—权限",
  "settings-sandbox": "设置—沙箱",
  "settings-network": "设置—网络",
  "settings-appearance": "设置—外观",
  "settings-about-privacy": "设置—版本与隐私",
};

export const RILL_ROUTES: readonly RillRouteDefinition[] = RILL_ROUTE_KEYS.map((key, index) => ({
  key,
  label: labels[key],
  figma: "FIGMA_LOCKED",
  brandSubstitution: true,
  batch: index < 8 ? 1 : index < 16 ? 2 : 3,
}));

const routeKeys = new Set<string>(RILL_ROUTE_KEYS);

export function isRillRouteKey(value: string): value is RillRouteKey {
  return routeKeys.has(value);
}

export interface RillVisualRequest {
  readonly page: RillRouteKey;
  readonly state: RillVisualState;
}

export function parseRillVisualRequest(search: string, development: boolean): RillVisualRequest | null {
  if (!development) return null;
  const params = new URLSearchParams(search);
  const page = params.get("rill-page");
  if (!page || !isRillRouteKey(page)) return null;
  return { page, state: params.get("rill-state") || "default" };
}

export const FIRST_BATCH_RILL_ROUTES = RILL_ROUTES.filter((route) => route.batch === 1);
