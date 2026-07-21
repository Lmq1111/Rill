import type { HeartbeatTask } from "../../custom/features/heartbeat/heartbeat.types";
import type { AutomationTask, Channel, Project, Session } from "../state/visualStore";

const WEEKDAY_FROM_BACKEND: Record<string, string> = {
  mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日",
};
const WEEKDAY_TO_BACKEND = Object.fromEntries(Object.entries(WEEKDAY_FROM_BACKEND).map(([key, value]) => [value, key]));
const UI_TIME_ZONES: Record<string, string> = {
  "Asia/Shanghai": "UTC+8 (Asia/Shanghai)",
  UTC: "UTC+0 (UTC)",
  "America/Los_Angeles": "UTC-8 (America/Los_Angeles)",
  Local: "跟随系统",
};
const BACKEND_TIME_ZONES = Object.fromEntries(Object.entries(UI_TIME_ZONES).map(([key, value]) => [value, key]));

type ParsedInterval = Pick<AutomationTask, "freqType" | "intervalVal" | "intervalUnit" | "time" | "weekday" | "monthday" | "month">;

function parseInterval(interval: string): ParsedInterval {
  const [duration, schedule = ""] = interval.split("|", 2);
  const durationMatch = duration.match(/^(\d+)([smh])$/);
  const intervalVal = Number(durationMatch?.[1] ?? 1);
  const intervalUnit = durationMatch?.[2] === "s" ? "秒" : durationMatch?.[2] === "h" ? "小时" : "分钟";
  const match = schedule.match(/^(daily|weekly|biweekly|monthly|yearly)(?::([^@]*))?(?:@(\d{2}:\d{2}))?$/);
  if (!match) {
    return { freqType: "interval", intervalVal, intervalUnit, time: "08:00", weekday: "周一", monthday: "1", month: "1 月" };
  }
  const freqType = match[1] as AutomationTask["freqType"];
  const rule = match[2] ?? "";
  const [yearMonth = "1", yearDay = "1"] = rule.split("-", 2);
  return {
    freqType,
    intervalVal,
    intervalUnit,
    time: match[3] ?? "09:00",
    weekday: WEEKDAY_FROM_BACKEND[rule.split(",")[0]] ?? "周一",
    monthday: freqType === "yearly" ? yearDay : rule || "1",
    month: `${freqType === "yearly" ? yearMonth : "1"} 月`,
  };
}

function buildInterval(task: AutomationTask) {
  if (task.freqType === "interval") {
    const value = Math.max(1, Math.trunc(task.intervalVal || 1));
    if (task.intervalUnit === "秒") return `${value}s`;
    if (task.intervalUnit === "天") return `${value * 24}h`;
    return `${value}${task.intervalUnit === "小时" ? "h" : "m"}`;
  }
  const bases: Record<Exclude<AutomationTask["freqType"], "interval">, string> = {
    daily: "24h", weekly: "168h", biweekly: "336h", monthly: "720h", yearly: "8760h",
  };
  let rule = task.freqType;
  if (task.freqType === "weekly" || task.freqType === "biweekly") rule += `:${WEEKDAY_TO_BACKEND[task.weekday] ?? "mon"}`;
  if (task.freqType === "monthly") rule += `:${task.monthday}`;
  if (task.freqType === "yearly") rule += `:${Number.parseInt(task.month, 10) || 1}-${task.monthday}`;
  return `${bases[task.freqType]}|${rule}@${task.time}`;
}

function projectScope(task: HeartbeatTask, projects: readonly Project[]) {
  if (task.scope !== "project") return "全局";
  return projects.find((project) => project.path === task.workspaceRoot)?.id ?? task.workspaceRoot ?? "missing-project";
}

function displayTime(timestamp: number | undefined) {
  if (!timestamp) return undefined;
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

export function adaptHeartbeatTasks(
  tasks: readonly HeartbeatTask[],
  projects: readonly Project[],
  sessions: readonly Session[],
  channels: readonly Channel[],
): AutomationTask[] {
  const connected = new Set(channels.filter((channel) => channel.connState === "connected").map((channel) => channel.id));
  return tasks.map((task) => {
    const parsed = parseInterval(task.interval);
    const topicSession = sessions.find((session) => session.topicId === task.topicId || session.id === task.topicId);
    const selectedChannel = task.notifyChannelIds?.find((id) => connected.has(id)) ?? task.notifyChannelIds?.[0];
    return {
      id: task.id,
      name: task.title,
      prompt: task.prompt,
      scope: projectScope(task, projects),
      ...parsed,
      startWeek: task.biweeklyStart ?? "",
      window: "精确",
      enabled: task.enabled,
      permission: task.approvalMode === "auto" ? "Auto" : task.approvalMode === "yolo" ? "YOLO" : "Ask",
      sessionPolicy: task.newConversationEachRun ? "new" : "reuse",
      push: task.notifyChannels === true,
      pushChannelId: selectedChannel,
      tz: UI_TIME_ZONES[task.timeZone || "Local"] ?? task.timeZone ?? "跟随系统",
      lastRun: displayTime(task.lastRunAt),
      lastResult: task.lastRunStatus ?? (task.lastRunAt ? "success" : "none"),
      lastError: task.lastRunError,
      nextRun: task.enabled ? "按计划执行" : "已停用",
      reuseSessionId: task.newConversationEachRun ? undefined : task.topicId,
      generatedSessionIds: topicSession ? [topicSession.id] : task.topicId ? [task.topicId] : [],
    };
  });
}

export function toHeartbeatTask(task: AutomationTask, projects: readonly Project[], previous?: HeartbeatTask): HeartbeatTask {
  const project = task.scope === "全局" ? undefined : projects.find((candidate) => candidate.id === task.scope);
  if (task.scope !== "全局" && (!project || project.status === "unavailable")) throw new Error("任务必须绑定有效项目");
  if (task.freqType === "biweekly" && !task.startWeek?.trim()) throw new Error("双周任务必须选择起始周");
  return {
    ...previous,
    id: task.id,
    title: task.name.trim(),
    prompt: task.prompt,
    interval: buildInterval(task),
    enabled: task.enabled,
    scope: project ? "project" : "global",
    workspaceRoot: project?.path ?? "",
    newConversationEachRun: task.sessionPolicy === "new",
    approvalMode: task.permission.toLowerCase() as HeartbeatTask["approvalMode"],
    notifyChannels: task.push,
    notifyChannelIds: task.push && task.pushChannelId ? [task.pushChannelId] : [],
    timeZone: BACKEND_TIME_ZONES[task.tz] ?? (task.tz || "Local"),
    biweeklyStart: task.freqType === "biweekly" ? task.startWeek?.trim() : "",
    createdAt: previous?.createdAt || Date.now(),
  };
}
