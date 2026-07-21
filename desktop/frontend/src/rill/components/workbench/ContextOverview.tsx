import { useState } from "react";
import {
  Gauge, RefreshCw, MessagesSquare, Coins, Database, Wallet, AlertTriangle,
  Trash2, Plus, Ban,
} from "lucide-react";
import { toast } from "sonner";
import { brand } from "../../../lib/brand";
import { PageShell } from "./PageShell";
import { useStore, projectName } from "../../state/visualStore";

function Metric({ icon: Icon, label, value, sub, unavailable }: { icon: typeof Coins; label: string; value: string; sub?: string; unavailable?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-[12px] text-slate-500"><Icon className="size-4 text-teal-600" />{label}</div>
      {unavailable ? (
        <div className="mt-2 flex items-center gap-1.5 text-[13px] text-slate-400"><Ban className="size-4" />不可用</div>
      ) : (
        <><div className="mt-2 text-[18px] text-slate-900">{value}</div>{sub && <div className="text-[11px] text-slate-400">{sub}</div>}</>
      )}
    </div>
  );
}

export function ContextOverview() {
  const { active, projects, params, clearContext, createSession } = useStore();
  const c = active.context;
  const [confirmClear, setConfirmClear] = useState(params.rillVisualState === "clear-context-confirmation");
  const [refreshing, setRefreshing] = useState(false);

  const pct = Math.round((c.used / c.limit) * 100);
  const usedK = Math.round(c.used / 1000);
  const limitK = Math.round(c.limit / 1000);
  const readonly = active.runState === "readonly";
  const money = (v: number | null) => v === null ? "" : `$${v.toFixed(2)}`;
  const hitRate = c.cacheHit !== null && c.cacheMiss !== null && (c.cacheHit + c.cacheMiss) > 0 ? Math.round((c.cacheHit / (c.cacheHit + c.cacheMiss)) * 100) : null;

  const refresh = () => { setRefreshing(true); toast("正在刷新上下文数据…"); setTimeout(() => { setRefreshing(false); toast.success("已刷新"); }, 800); };

  return (
    <PageShell icon={Gauge} title="上下文概览" subtitle={`当前会话：${active.title} · ${projectName(projects, active.projectId)}`}
      actions={<button onClick={refresh} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> 刷新</button>}>
      <div className="mx-auto h-full max-w-3xl overflow-y-auto p-6">
        {active.modelContextClearedAt && (
          <div className="mb-4 rounded-lg bg-cyan-50 px-3 py-2 text-[12.5px] text-cyan-700 ring-1 ring-cyan-200">
            模型上下文已于{active.modelContextClearedAt}清空；历史消息仍完整保留，可继续查阅。
          </div>
        )}
        <div className={`rounded-xl border p-5 ${pct >= 100 ? "border-rose-200 bg-rose-50" : pct >= 90 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-slate-600">上下文窗口占用</span>
            <span className="text-[15px] text-slate-900">{pct}% <span className="text-[12px] text-slate-400">· {usedK}k / {limitK}k</span></span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full ${pct >= 100 ? "bg-rose-500" : pct >= 90 ? "bg-amber-500" : "bg-teal-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11.5px]">
            <span className="text-slate-400">剩余 {limitK - usedK}k</span>
            {pct >= 90 && <span className={`flex items-center gap-1 ${pct >= 100 ? "text-rose-600" : "text-amber-600"}`}><AlertTriangle className="size-3.5" />{pct >= 100 ? "上下文已满，建议清空或新建会话" : "接近上限，建议尽快清理"}</span>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Metric icon={MessagesSquare} label="会话轮数" value={`${c.rounds} 轮`} />
          <Metric icon={Database} label="会话累计 Token" value={c.used.toLocaleString()} />
          <Metric icon={Gauge} label="本轮 Token" value={c.roundTokens ? c.roundTokens.toLocaleString() : "—"} sub={`最近刷新 ${c.refreshedAt}`} />
          <Metric icon={Database} label="缓存命中" value={c.cacheHit === null ? "" : c.cacheHit.toLocaleString()} sub={hitRate !== null ? `命中率 ${hitRate}%` : undefined} unavailable={c.cacheHit === null} />
          <Metric icon={Database} label="缓存未命中" value={c.cacheMiss === null ? "" : c.cacheMiss.toLocaleString()} unavailable={c.cacheMiss === null} />
          <Metric icon={Coins} label="本轮成本" value={money(c.roundCost)} sub={c.roundCost === null ? undefined : c.currency} unavailable={c.roundCost === null} />
          <Metric icon={Coins} label="会话累计成本" value={money(c.totalCost)} sub={c.totalCost === null ? undefined : c.currency} unavailable={c.totalCost === null} />
          <Metric icon={Wallet} label="账户余额" value={money(c.balance)} sub={c.balance === null ? undefined : c.currency} unavailable={c.balance === null} />
        </div>
        {(c.balance === null || c.roundCost === null) && <p className="mt-3 text-[11.5px] text-slate-400">部分指标当前模型未提供有效计费信息，已标记为不可用（不以零值冒充）。</p>}

        {!readonly && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"><Trash2 className="size-4" />清空上下文</button>
            <button onClick={() => createSession(active.projectId)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-[13px] text-white hover:bg-teal-700"><Plus className="size-4" />新建会话</button>
          </div>
        )}
        {readonly && <div className="mt-5 rounded-lg bg-slate-100 px-3 py-2 text-[12.5px] text-slate-500">只读历史会话：上下文为归档快照，不可清空。</div>}
      </div>

      {confirmClear && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600"><AlertTriangle className="size-5" /><h3 className="text-[15px] text-slate-900">清空上下文</h3></div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">清空后，当前会话已积累的对话与工具结果将从上下文中移除，{brand.productName}将失去这些记忆。此操作不影响历史记录中的原始会话。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmClear(false)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
              <button onClick={() => { clearContext(active.id); setConfirmClear(false); }} className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-rose-700">确认清空</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
