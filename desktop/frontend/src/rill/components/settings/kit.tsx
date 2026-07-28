import type { ReactNode } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

/* 区块标题 */
export function Section({ title, desc, children, actions }: { title: string; desc?: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] text-slate-900">{title}</h3>
          {desc && <p className="mt-0.5 text-[12px] text-slate-400">{desc}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* 单行设置项 */
export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <div className="text-[13px] text-slate-800">{label}</div>
        {hint && <div className="mt-0.5 text-[11.5px] text-slate-400">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 outline-none focus:border-teal-300">
      {options.map((o, i) => <option key={`${o}-${i}`}>{o}</option>)}
    </select>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-teal-600" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

/* 连接 / 认证状态徽标 */
const connMeta: Record<string, { label: string; cls: string }> = {
  connected: { label: "已连接", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  failed: { label: "连接失败", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  missingKey: { label: "缺少密钥", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  disabled: { label: "已停用", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  testing: { label: "测试中", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  connecting: { label: "连接中", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  onDemand: { label: "按需等待", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  authExpired: { label: "认证过期", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  ok: { label: "正常", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  error: { label: "异常", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

export function StateBadge({ state }: { state: string }) {
  const m = connMeta[state] ?? { label: state, cls: "bg-slate-100 text-slate-500 ring-slate-200" };
  const spinning = state === "testing" || state === "connecting";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${m.cls}`}>
      {spinning && <Loader2 className="size-3 animate-spin" />}
      {m.label}
    </span>
  );
}

/* 演示状态切换器 */
export function StateSwitcher<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] text-slate-400">演示状态：</span>
      {options.map((o) => (
        <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors ${value === o.id ? "bg-teal-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* 未保存变更保存条 */
export function SaveBar({ dirty, saving, onSave, onReset, note }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void; note?: string }) {
  if (!dirty && !saving) return null;
  return (
    <div className="sticky bottom-0 z-10 mt-4 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/90 px-4 py-2.5 backdrop-blur">
      <span className="text-[12.5px] text-teal-800">{saving ? "正在保存…" : "有未保存的修改"}</span>
      {note && <span className="text-[11.5px] text-amber-700">{note}</span>}
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onReset} disabled={saving} className="rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">放弃</button>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-[12.5px] text-white hover:bg-teal-700 disabled:opacity-50">
          {saving && <Loader2 className="size-3.5 animate-spin" />} 保存
        </button>
      </div>
    </div>
  );
}

/* 确认弹窗 */
export function ConfirmDialog({ open, title, tone = "rose", children, confirmText = "确认", onConfirm, onCancel }: {
  open: boolean; title: string; tone?: "rose" | "amber"; children: ReactNode; confirmText?: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  const btn = tone === "rose" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700";
  const ico = tone === "rose" ? "text-rose-600" : "text-amber-600";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className={`flex items-center gap-2 ${ico}`}>
          <AlertTriangle className="size-5" />
          <h3 className="text-[15px] text-slate-900">{title}</h3>
        </div>
        <div className="mt-2 text-[13px] leading-relaxed text-slate-600">{children}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
          <button onClick={onConfirm} className={`rounded-lg px-3.5 py-1.5 text-[13px] text-white ${btn}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

/* 侧滑抽屉 */
export function Drawer({ title, onClose, children, footer, width = "max-w-lg" }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className={`flex h-full w-full ${width} flex-col bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 className="text-[15px] text-slate-900">{title}</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 p-4">{footer}</div>}
      </div>
    </div>
  );
}

/* 凭据字段（隐藏原文，仅保存/替换/清除） */
export function SecretField({ hasValue, envName }: { hasValue: boolean; envName: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-slate-500">API Key（环境变量 {envName}）</span>
        <span className="text-[11px] text-slate-400">不显示原文</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 rounded-md bg-white px-3 py-1.5 font-mono text-[12px] text-slate-400 ring-1 ring-slate-200">
          {hasValue ? "•••••••••••••••• 已保存" : "未配置"}
        </div>
        <button className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{hasValue ? "替换" : "保存"}</button>
        {hasValue && <button className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">清除</button>}
      </div>
    </div>
  );
}
