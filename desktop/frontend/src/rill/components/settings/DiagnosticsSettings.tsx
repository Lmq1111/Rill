import { useState } from "react";
import { Play, RefreshCw, Copy, Download, ChevronRight, CheckCircle2, AlertTriangle, XCircle, MinusCircle, Eye, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody, type GoTo } from "./Settings";
import { Section, Toggle } from "./kit";
import { diagItems as seed, type DiagItem } from "./data";
import type { SettingsTab } from "./data";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";

type Run = "idle" | "running" | "done" | "rechecking";

const resultMeta: Record<DiagItem["result"], { icon: typeof CheckCircle2; cls: string; ring: string }> = {
  ok: { icon: CheckCircle2, cls: "text-emerald-600", ring: "ring-emerald-200" },
  warn: { icon: AlertTriangle, cls: "text-amber-600", ring: "ring-amber-200" },
  error: { icon: XCircle, cls: "text-rose-600", ring: "ring-rose-200" },
  unchecked: { icon: MinusCircle, cls: "text-slate-400", ring: "ring-slate-200" },
  unavailable: { icon: MinusCircle, cls: "text-slate-500", ring: "ring-slate-200" },
};

export function DiagnosticsSettings({ goTo }: { goTo: GoTo }) {
  const { params } = useStore();
  const [run, setRun] = useState<Run>(() => initialVisualState(params.rillVisualState, ["idle", "running", "done", "rechecking"] as const, "done"));
  const [items] = useState<DiagItem[]>(seed);
  const [filter, setFilter] = useState<"all" | "error" | "warn" | "ok" | "unchecked">("all");
  const [includeRuntime, setIncludeRuntime] = useState(false);
  const [includeErrors, setIncludeErrors] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  const counts = {
    error: items.filter((i) => i.result === "error").length,
    warn: items.filter((i) => i.result === "warn").length,
    ok: items.filter((i) => i.result === "ok").length,
    unchecked: items.filter((i) => i.result === "unchecked" || i.result === "unavailable").length,
  };

  const shown = run === "idle" ? items.map((i) => ({ ...i, result: "unchecked" as const, severity: "未检查" as const })) : items;
  const filtered = shown.filter((i) => filter === "all" || (filter === "unchecked" ? (i.result === "unchecked" || i.result === "unavailable") : i.result === filter));

  const fullRun = () => { setRun("running"); toast("正在执行完整诊断…"); setTimeout(() => { setRun("done"); toast.success("诊断完成"); }, 1400); };
  const recheck = () => { setRun("rechecking"); toast("正在重新检查失败项…"); setTimeout(() => { setRun("done"); toast.success("重新检查完成"); }, 1200); };

  const buildJson = () => JSON.stringify({
    app: `${brand.productName} ${brand.version}`, cli: brand.cliBrand, platform: "macOS 15.4 arm64", generatedAt: "本机生成",
    checks: items.map((i) => ({ name: i.name, result: i.result, detail: i.detail })),
    runtime: includeRuntime ? { node: "20.11.0", memory: "16GB" } : "（用户未选择包含）",
    recentErrors: includeErrors ? ["MCP OAuth expired (redacted)"] : "（用户未选择包含）",
    redactedFields: ["apiKey", "token", "cookie", "authHeaders", "sessionBody", "fileContents"],
  }, null, 2);

  const copyJson = () => { navigator.clipboard?.writeText?.(buildJson()); toast.success("已复制脱敏诊断 JSON"); };
  const exportJson = (fail?: boolean) => fail ? toast.error("导出失败", { description: "无法写入所选位置，请重试或改用复制" }) : toast.success("已导出脱敏诊断 JSON");

  return (
    <SettingsBody title="诊断" desc={`检查${brand.productName}本地运行所需能力，定位配置或依赖问题；诊断数据只在本机生成，不自动上传`}>
      <StateSwitcherLocal run={run} setRun={setRun} />

      <div className="mb-4 flex items-center gap-2">
        <button onClick={fullRun} disabled={run === "running"} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-[13px] text-white hover:bg-teal-700 disabled:opacity-50">{run === "running" ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}执行完整诊断</button>
        <button onClick={recheck} disabled={run === "rechecking" || counts.error + counts.warn === 0} className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">{run === "rechecking" ? <RefreshCw className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}重新检查失败项</button>
      </div>

      {/* 结果概览 */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { k: "error" as const, label: "错误", n: counts.error, cls: "text-rose-600" },
          { k: "warn" as const, label: "警告", n: counts.warn, cls: "text-amber-600" },
          { k: "ok" as const, label: "正常", n: counts.ok, cls: "text-emerald-600" },
          { k: "unchecked" as const, label: "未检查/不可用", n: counts.unchecked, cls: "text-slate-500" },
        ].map((c) => (
          <button key={c.k} onClick={() => setFilter(filter === c.k ? "all" : c.k)} className={`rounded-xl border bg-white p-3 text-left transition-colors ${filter === c.k ? "border-teal-300 ring-1 ring-teal-200" : "border-slate-200 hover:bg-slate-50"}`}>
            <div className={`text-[20px] ${c.cls}`}>{run === "idle" ? "—" : c.n}</div>
            <div className="mt-0.5 text-[11.5px] text-slate-500">{c.label}</div>
          </button>
        ))}
      </div>

      <Section title="检查项" desc={filter === "all" ? "点击上方分类可筛选" : `已筛选：${filter}`}>
        <div className="space-y-2">
          {filtered.map((i) => {
            const m = resultMeta[i.result];
            const Icon = m.icon;
            return (
              <div key={i.id} className={`flex items-start gap-3 rounded-lg border border-slate-200 p-3 ring-1 ring-inset ${m.ring}`}>
                <Icon className={`mt-0.5 size-4 shrink-0 ${m.cls}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-[13.5px] text-slate-900">{i.name}</span><span className="text-[11px] text-slate-400">{i.severity}</span></div>
                  <p className="mt-0.5 text-[12px] text-slate-500">{i.detail}</p>
                  <div className="mt-0.5 text-[11px] text-slate-400">检查时间：{run === "idle" ? "—" : i.checkedAt}</div>
                </div>
                {i.suggestTab && run !== "idle" && (i.result === "error" || i.result === "warn") && (
                  <button onClick={() => goTo(i.suggestTab as SettingsTab)} className="flex shrink-0 items-center gap-1 self-center rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50">前往处理<ChevronRight className="size-3.5" /></button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="py-6 text-center text-[13px] text-slate-400">没有该类别的检查项</div>}
        </div>
      </Section>

      <div className="mt-4">
        <Section title="可选运行时信息" desc="以下信息默认不收集，仅在你主动选择后才纳入诊断">
          <Row2 label="包含运行时信息（Node 版本、内存等）"><Toggle checked={includeRuntime} onChange={setIncludeRuntime} /></Row2>
          <Row2 label="包含最近本地错误摘要"><Toggle checked={includeErrors} onChange={setIncludeErrors} /></Row2>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="导出脱敏诊断" desc="诊断只在本机生成，不会自动上传" actions={
          <button onClick={() => setShowChecklist((s) => !s)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Eye className="size-3.5" />脱敏清单</button>
        }>
          {showChecklist && (
            <div className="mb-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600">
              <div className="flex items-center gap-1.5 text-slate-700"><ShieldCheck className="size-4 text-emerald-600" />导出内容不会包含：</div>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                <li>完整 API Key、Token</li><li>Cookie 与认证请求头</li><li>会话正文与用户文件正文</li>
              </ul>
            </div>
          )}
          <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">{buildJson()}</pre>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={copyJson} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Copy className="size-4" />复制</button>
            <button onClick={() => exportJson(false)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] text-white hover:bg-teal-700"><Download className="size-4" />导出 JSON</button>
            <button onClick={() => exportJson(true)} className="text-[11.5px] text-slate-400 hover:text-rose-600">模拟导出失败</button>
          </div>
        </Section>
      </div>
    </SettingsBody>
  );
}

function Row2({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0"><span className="text-[13px] text-slate-800">{label}</span>{children}</div>;
}

function StateSwitcherLocal({ run, setRun }: { run: Run; setRun: (r: Run) => void }) {
  const opts: { id: Run; label: string }[] = [{ id: "idle", label: "未诊断" }, { id: "running", label: "诊断中" }, { id: "done", label: "已完成" }, { id: "rechecking", label: "重新检查中" }];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] text-slate-400">演示状态：</span>
      {opts.map((o) => <button key={o.id} aria-pressed={run === o.id} onClick={() => setRun(o.id)} className={`rounded-full px-2.5 py-1 text-[11.5px] ${run === o.id ? "bg-teal-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{o.label}</button>)}
    </div>
  );
}
