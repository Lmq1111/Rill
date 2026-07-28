import { useState } from "react";
import { Keyboard, Search, RotateCcw, X, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { SettingsBody } from "./Settings";
import { Section, SaveBar, ConfirmDialog } from "./kit";
import { brand } from "../../../lib/brand";
import { useRillSettingsOptional } from "../../settings/runtime";
import { LiveKeyboardSettings } from "./live/LiveKeyboardSettings";

interface Binding { id: string; action: string; scope: string; current: string; def: string; }

const seed: Binding[] = [
  { id: "k1", action: "打开命令面板", scope: "全局", current: "⌘K", def: "⌘K" },
  { id: "k2", action: "新建会话", scope: "全局", current: "⌘N", def: "⌘N" },
  { id: "k3", action: "发送消息", scope: "输入框", current: "⌘↵", def: "⌘↵" },
  { id: "k4", action: "中断任务", scope: "全局", current: "⌘.", def: "⌘." },
  { id: "k5", action: "打开设置", scope: "全局", current: "⌘,", def: "⌘," },
  { id: "k6", action: "切换侧栏", scope: "全局", current: "⌘B", def: "⌘B" },
  { id: "k7", action: "查看改动", scope: "全局", current: "⌘G", def: "⌘⇧G" },
];

// 系统保留组合
const RESERVED = new Set(["⌘Q", "⌘W", "⌘M", "⌘H", "⌘空格"]);

export function KeyboardSettings() {
  const live = useRillSettingsOptional();
  return live ? <LiveKeyboardSettings live={live} /> : <VisualKeyboardSettings />;
}

function VisualKeyboardSettings() {
  const [items, setItems] = useState<Binding[]>(seed);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState<string | null>(null);
  const [pending, setPending] = useState("");
  const [resetAll, setResetAll] = useState(false);

  const list = items.filter((b) => !query || b.action.includes(query) || b.current.toLowerCase().includes(query.toLowerCase()));

  // 当前捕获值的冲突/校验
  const conflict = pending ? items.find((b) => b.id !== capturing && b.scope === (items.find((x) => x.id === capturing)?.scope) && b.current === pending) : undefined;
  const modifierOnly = ["⌘", "⌥", "⌃", "⇧"].includes(pending);
  const reserved = RESERVED.has(pending);
  const valid = pending && !conflict && !modifierOnly && !reserved;

  const applyCapture = () => {
    if (!valid) return;
    setItems((is) => is.map((b) => b.id === capturing ? { ...b, current: pending } : b));
    setDirty(true); setCapturing(null); setPending(""); toast.success("已录入快捷键");
  };

  // 演示：模拟录入不同类型的按键
  const simulate = (v: string) => setPending(v);

  return (
    <SettingsBody title="快捷键" desc={`查看和修改${brand.productName}常用操作的键盘快捷键，并在保存前发现按键冲突`}>
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
        <Search className="size-4 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按操作名称或按键组合搜索" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
      </div>

      <Section title="快捷键列表" actions={
        <button onClick={() => setResetAll(true)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw className="size-3.5" />恢复全部默认</button>
      }>
        {list.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Keyboard className="size-7 text-slate-300" /><p className="mt-2">没有匹配的操作</p></div>
        ) : (
          <div className="space-y-1">
            {list.map((b) => {
              const modified = b.current !== b.def;
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="text-[13px] text-slate-800">{b.action}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{b.scope}</span>{modified && <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10.5px] text-teal-700">已修改</span>}</div>
                    {modified && <div className="mt-0.5 text-[11px] text-slate-400">默认：<kbd className="rounded bg-slate-100 px-1 font-mono">{b.def}</kbd></div>}
                  </div>
                  <kbd className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[12px] text-slate-700">{b.current}</kbd>
                  <button onClick={() => { setCapturing(b.id); setPending(""); }} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">录入</button>
                  {modified && <button onClick={() => { setItems((is) => is.map((x) => x.id === b.id ? { ...x, current: x.def } : x)); setDirty(true); toast("已恢复该项默认值"); }} className="grid size-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="恢复默认"><RotateCcw className="size-3.5" /></button>}
                  <button onClick={() => { setItems((is) => is.map((x) => x.id === b.id ? { ...x, current: "未设置" } : x)); setDirty(true); toast("已清除该快捷键"); }} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" title="清除"><X className="size-3.5" /></button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <SaveBar dirty={dirty} saving={saving} onSave={() => { setSaving(true); setTimeout(() => { setSaving(false); setDirty(false); toast.success("快捷键已保存"); }, 600); }} onReset={() => { setItems(seed); setDirty(false); toast("已放弃修改"); }} />

      {/* 录入弹窗 */}
      {capturing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-[15px] text-slate-900">录入快捷键 · {items.find((x) => x.id === capturing)?.action}</h3>
            <p className="mt-1 text-[12px] text-slate-400">按下新的组合键（演示环境请点击下方按键模拟）。按当前系统显示为 macOS 符号。</p>
            <div className={`mt-3 grid h-16 place-items-center rounded-xl border-2 border-dashed ${valid ? "border-emerald-300 bg-emerald-50" : conflict || reserved || modifierOnly ? "border-rose-300 bg-rose-50" : "border-slate-300 bg-slate-50"}`}>
              <span className="font-mono text-[18px] text-slate-800">{pending || "等待按键…"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["⌘⇧P", "⌘N", "⌘Q", "⌘", "⌥↵"].map((k) => <button key={k} onClick={() => simulate(k)} className="rounded-lg bg-white px-2.5 py-1 font-mono text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{k}</button>)}
            </div>
            {conflict && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-rose-700"><AlertTriangle className="size-4" />与「{conflict.action}」冲突（同一作用范围）。</div>}
            {reserved && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-rose-700"><AlertTriangle className="size-4" />该组合被当前系统保留，无法可靠使用。</div>}
            {modifierOnly && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-rose-700"><AlertTriangle className="size-4" />仅修饰键不能作为完整快捷键。</div>}
            {valid && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-700"><Check className="size-4" />按键有效。</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setCapturing(null); setPending(""); }} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
              {conflict && <button onClick={() => { const cid = conflict.id; setCapturing(cid); setPending(""); toast("已转到冲突项重新设置"); }} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50">转到冲突项</button>}
              <button onClick={applyCapture} disabled={!valid} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700 disabled:opacity-40">确认</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={resetAll} title="恢复全部默认值" tone="amber" confirmText="全部恢复" onConfirm={() => { setItems(seed); setResetAll(false); setDirty(true); toast.success("已恢复全部默认快捷键"); }} onCancel={() => setResetAll(false)}>
        将覆盖你所有的自定义快捷键，包括：{items.filter((b) => b.current !== b.def).map((b) => b.action).join("、") || "（当前无自定义项）"}。确认恢复？
      </ConfirmDialog>
    </SettingsBody>
  );
}
