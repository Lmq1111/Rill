import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Copy, Download, Eye, MinusCircle, Play, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import type { CapabilityDiagnosticsReport } from "../../../../lib/types";
import type { RillSettingsContextValue } from "../../../settings/runtime";
import { buildRillDiagnosticsPayload } from "../../../settings/diagnostics";
import type { SettingsTab } from "../data";
import { SettingsBody, type GoTo } from "../Settings";
import { Section, Toggle } from "../kit";

type Result = "ok" | "warn" | "error" | "unchecked";
type Item = { id: string; name: string; result: Result; severity: string; detail: string; suggestTab?: SettingsTab };

const resultMeta: Record<Result, { icon: typeof CheckCircle2; cls: string; ring: string }> = {
  ok: { icon: CheckCircle2, cls: "text-emerald-600", ring: "ring-emerald-200" },
  warn: { icon: AlertTriangle, cls: "text-amber-600", ring: "ring-amber-200" },
  error: { icon: XCircle, cls: "text-rose-600", ring: "ring-rose-200" },
  unchecked: { icon: MinusCircle, cls: "text-slate-400", ring: "ring-slate-200" },
};

function settingsTab(value?: string): SettingsTab | undefined {
  const map: Record<string, SettingsTab> = { models: "model", bots: "bot", mcp: "mcp", skills: "skill", subagents: "subagent", plugins: "plugin", memory: "memory", hooks: "hooks", diagnostics: "diagnostics", shortcuts: "keys", permissions: "permissions", sandbox: "sandbox", network: "network", appearance: "appearance", updates: "about" };
  return value ? map[value] : undefined;
}

function reportItems(report: CapabilityDiagnosticsReport): Item[] {
  const issues = (report.issues ?? []).map((issue, index): Item => ({
    id: `${issue.code}-${issue.name ?? ""}-${index}`,
    name: issue.name || issue.subsystem || issue.code,
    result: issue.severity === "error" ? "error" : issue.severity === "warning" ? "warn" : "ok",
    severity: issue.severity,
    detail: `${issue.message}${issue.remediation ? ` · ${issue.remediation}` : ""}`,
    suggestTab: settingsTab(issue.settings_tab),
  }));
  if (issues.length > 0) return issues;
  return [{ id: "healthy", name: "本地能力配置", result: "ok", severity: "正常", detail: "未发现需要处理的配置问题。" }];
}

export function LiveDiagnosticsSettings({ live, goTo }: { live: RillSettingsContextValue; goTo: GoTo }) {
  const [report, setReport] = useState<CapabilityDiagnosticsReport | null>(live.snapshot?.diagnostics ?? null);
  const [running, setRunning] = useState(false);
  const [includeRuntime, setIncludeRuntime] = useState(false);
  const [filter, setFilter] = useState<"all" | Result>("all");
  const [showChecklist, setShowChecklist] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState(false);
  const [exportedPath, setExportedPath] = useState("");
  const [version, setVersion] = useState("dev");

  useEffect(() => {
    if (live.snapshot?.diagnostics) setReport(live.snapshot.diagnostics);
  }, [live.snapshot?.diagnostics]);
  useEffect(() => {
    let active = true;
    if (live.backend.Version) void live.backend.Version().then((value) => { if (active) setVersion(value); }).catch(() => {});
    return () => { active = false; };
  }, [live.backend]);

  const items = useMemo(() => report ? reportItems(report) : [], [report]);
  const counts = useMemo(() => ({
    error: items.filter((item) => item.result === "error").length,
    warn: items.filter((item) => item.result === "warn").length,
    ok: items.filter((item) => item.result === "ok").length,
    unchecked: report ? 0 : 1,
  }), [items, report]);
  const shown = items.filter((item) => filter === "all" || item.result === filter);
  const payload = report && live.snapshot ? buildRillDiagnosticsPayload(report, {
    version,
    settings: {
      checkUpdates: live.snapshot.settings.checkUpdates,
      telemetry: live.snapshot.settings.telemetry,
      metrics: live.snapshot.settings.metrics,
    },
  }) : "";

  const run = async () => {
    setRunning(true);
    setActionError("");
    try {
      setReport(await live.backend.CapabilityDiagnostics(includeRuntime));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    if (!payload) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("系统剪贴板不可用");
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setActionError("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "复制诊断失败");
    }
  };

  const exportJSON = async () => {
    if (!payload) return;
    try {
      if (!live.backend.PickExportFile || !live.backend.SaveExportFile) throw new Error("当前桌面后端缺少诊断导出绑定");
      const path = await live.backend.PickExportFile("rill-diagnostics.json", "application/json");
      if (!path) return;
      await live.backend.SaveExportFile(path, payload, false);
      setExportedPath(path);
      setActionError("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "导出诊断失败");
    }
  };

  return (
    <SettingsBody title="诊断" desc="检查 Rill 本地运行所需能力，定位配置或依赖问题；诊断数据只在本机生成，不自动上传">
      {(live.error || actionError) && <div role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{actionError || live.error}</div>}
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => void run()} disabled={running} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-[13px] text-white disabled:opacity-50">{running ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}{running ? "正在诊断…" : "执行完整诊断"}</button>
        <label className="flex items-center gap-2 text-[12px] text-slate-500"><Toggle checked={includeRuntime} onChange={setIncludeRuntime} />包含当前会话运行状态</label>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">{[
        { k: "error" as const, label: "错误", n: counts.error, cls: "text-rose-600" },
        { k: "warn" as const, label: "警告", n: counts.warn, cls: "text-amber-600" },
        { k: "ok" as const, label: "正常", n: counts.ok, cls: "text-emerald-600" },
        { k: "unchecked" as const, label: "未检查/不可用", n: counts.unchecked, cls: "text-slate-500" },
      ].map((count) => <button key={count.k} onClick={() => setFilter(filter === count.k ? "all" : count.k)} className={`rounded-xl border bg-white p-3 text-left ${filter === count.k ? "border-teal-300 ring-1 ring-teal-200" : "border-slate-200"}`}><div className={`text-[20px] ${count.cls}`}>{count.n}</div><div className="mt-0.5 text-[11.5px] text-slate-500">{count.label}</div></button>)}</div>

      <Section title="检查项" desc={filter === "all" ? "点击上方分类可筛选" : `已筛选：${filter}`}>
        <div className="space-y-2">{shown.map((item) => {
          const meta = resultMeta[item.result];
          const Icon = meta.icon;
          return <div key={item.id} className={`flex items-start gap-3 rounded-lg border border-slate-200 p-3 ring-1 ring-inset ${meta.ring}`}><Icon className={`mt-0.5 size-4 shrink-0 ${meta.cls}`} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[13.5px] text-slate-900">{item.name}</span><span className="text-[11px] text-slate-400">{item.severity}</span></div><p className="mt-0.5 text-[12px] text-slate-500">{item.detail}</p></div>{item.suggestTab && (item.result === "error" || item.result === "warn") && <button onClick={() => goTo(item.suggestTab!)} className="flex shrink-0 items-center gap-1 self-center rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-teal-700 ring-1 ring-teal-200">前往处理<ChevronRight className="size-3.5" /></button>}</div>;
        })}{shown.length === 0 && <div className="py-6 text-center text-[13px] text-slate-400">没有该类别的检查项</div>}</div>
      </Section>

      <div className="mt-4"><Section title="导出脱敏诊断" desc="诊断只在本机生成，不会自动上传" actions={<button onClick={() => setShowChecklist((current) => !current)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200"><Eye className="size-3.5" />脱敏清单</button>}>
        {showChecklist && <div className="mb-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600"><div className="flex items-center gap-1.5 text-slate-700"><ShieldCheck className="size-4 text-emerald-600" />导出内容不会包含：</div><ul className="mt-1.5 list-disc space-y-0.5 pl-5"><li>API Key、Token、密码、Cookie 与认证请求头</li><li>会话正文、用户文件正文与未脱敏私人路径</li></ul></div>}
        <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">{payload || "诊断尚未生成"}</pre>
        <div className="mt-3 flex items-center gap-2"><button disabled={!payload} onClick={() => void copy()} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"><Copy className="size-4" />{copied ? "已复制" : "复制"}</button><button disabled={!payload} onClick={() => void exportJSON()} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] text-white disabled:opacity-40"><Download className="size-4" />导出 JSON</button>{exportedPath && <span className="max-w-xs truncate font-mono text-[11px] text-emerald-600" title={exportedPath}>已保存：{exportedPath}</span>}</div>
      </Section></div>
    </SettingsBody>
  );
}
