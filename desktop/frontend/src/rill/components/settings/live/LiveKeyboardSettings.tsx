import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { AlertTriangle, Check, Keyboard, RotateCcw, Search, X } from "lucide-react";
import type { RillSettingsContextValue } from "../../../settings/runtime";
import {
  comboFromKeyboardEvent,
  decodeDesktopShortcuts,
  defaultShortcutCombo,
  detectShortcutPlatform,
  encodeDesktopShortcuts,
  formatShortcutCombo,
  replaceCustomShortcuts,
  shortcutDefinitions,
  type ShortcutAction,
  type ShortcutCombo,
} from "../../../../lib/keyboardShortcuts";
import { SettingsBody } from "../Settings";
import { ConfirmDialog, SaveBar, Section } from "../kit";

const labels: Partial<Record<ShortcutAction, string>> = {
  "app.newSession": "新建会话",
  "commandPalette.open": "打开命令面板",
  "settings.open": "打开设置",
  "tab.close": "关闭当前会话",
  "selection.addToChat": "引用选中内容",
  "shell.toggle": "切换 Shell 输入",
  "sidebar.toggle": "切换侧栏",
  "textSize.increase": "增大文字",
  "textSize.decrease": "减小文字",
  "textSize.reset": "恢复文字大小",
  "toolApproval.yolo": "切换 YOLO 权限",
  "shortcuts.show": "显示快捷键帮助",
};

const sectionLabels: Record<string, string> = { global: "全局", session: "会话", view: "视图", tools: "工具", help: "帮助" };
const systemReserved = new Set(["⌘Q", "⌘W", "⌘M", "⌘H", "Ctrl+Q", "Ctrl+W", "Alt+F4"]);
const emptyShortcuts: Record<string, string> = Object.freeze({});

function sameCombo(left: ShortcutCombo, right: ShortcutCombo, platform: ReturnType<typeof detectShortcutPlatform>) {
  return formatShortcutCombo(left, platform) === formatShortcutCombo(right, platform);
}

export function LiveKeyboardSettings({ live }: { live: RillSettingsContextValue }) {
  const saved = live.snapshot?.settings.desktopShortcuts ?? emptyShortcuts;
  const platform = useMemo(() => detectShortcutPlatform(), []);
  const definitions = useMemo(() => shortcutDefinitions().filter((definition) => definition.configurable !== false), []);
  const [draft, setDraft] = useState<Partial<Record<ShortcutAction, ShortcutCombo>>>(() => decodeDesktopShortcuts(saved));
  const [query, setQuery] = useState("");
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);
  const [pending, setPending] = useState<ShortcutCombo | null>(null);
  const [resetAll, setResetAll] = useState(false);

  useEffect(() => {
    const decoded = decodeDesktopShortcuts(saved);
    setDraft(decoded);
    replaceCustomShortcuts(decoded);
  }, [saved]);

  const dirty = JSON.stringify(encodeDesktopShortcuts(draft)) !== JSON.stringify(saved);
  const current = (action: ShortcutAction) => draft[action] ?? defaultShortcutCombo(action, platform);
  const list = definitions.filter((definition) => {
    const label = labels[definition.action] ?? definition.action;
    const combo = formatShortcutCombo(current(definition.action), platform);
    return !query || label.includes(query) || combo.toLowerCase().includes(query.toLowerCase());
  });
  const conflict = pending && capturing ? definitions.find((definition) => definition.action !== capturing && sameCombo(current(definition.action), pending, platform)) : undefined;
  const formattedPending = pending ? formatShortcutCombo(pending, platform) : "";
  const reserved = Boolean(formattedPending && systemReserved.has(formattedPending));
  const valid = Boolean(pending?.key && !conflict && !reserved);

  const capture = (event: KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const combo = comboFromKeyboardEvent(event.nativeEvent);
    if (combo) setPending(combo);
  };

  const applyCapture = () => {
    if (!capturing || !pending || !valid) return;
    setDraft((currentDraft) => ({ ...currentDraft, [capturing]: pending }));
    setCapturing(null);
    setPending(null);
  };

  const save = async () => {
    const encoded = encodeDesktopShortcuts(draft);
    const ok = await live.apply("保存快捷键", async () => {
      if (!live.backend.SetDesktopShortcuts) throw new Error("当前桌面后端缺少快捷键保存绑定");
      await live.backend.SetDesktopShortcuts(encoded);
    });
    if (ok) replaceCustomShortcuts(draft);
  };

  const reset = () => setDraft(decodeDesktopShortcuts(saved));

  return (
    <SettingsBody title="快捷键" desc="查看和修改 Rill 常用操作的键盘快捷键，并在保存前发现按键冲突">
      {live.error && <div role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{live.error}</div>}
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300"><Search className="size-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="按操作名称或按键组合搜索" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" /></div>
      <Section title="快捷键列表" desc="保存后由桌面后端确认并写入用户配置，重启后恢复" actions={<button onClick={() => setResetAll(true)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200"><RotateCcw className="size-3.5" />恢复全部默认</button>}>
        {list.length === 0 ? <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Keyboard className="size-7 text-slate-300" /><p className="mt-2">没有匹配的操作</p></div> : <div className="space-y-1">{list.map((definition) => {
          const combo = current(definition.action);
          const modified = Boolean(draft[definition.action]);
          return <div key={definition.action} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[13px] text-slate-800">{labels[definition.action] ?? definition.action}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{sectionLabels[definition.section] ?? definition.section}</span>{modified && <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10.5px] text-teal-700">已修改</span>}</div>{modified && <div className="mt-0.5 text-[11px] text-slate-400">默认：<kbd className="rounded bg-slate-100 px-1 font-mono">{formatShortcutCombo(defaultShortcutCombo(definition.action, platform), platform)}</kbd></div>}</div><kbd className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[12px] text-slate-700">{formatShortcutCombo(combo, platform)}</kbd><button onClick={() => { setCapturing(definition.action); setPending(null); }} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200">录入</button>{modified && <button onClick={() => setDraft((currentDraft) => { const next = { ...currentDraft }; delete next[definition.action]; return next; })} title="恢复默认" className="grid size-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><RotateCcw className="size-3.5" /></button>}<button onClick={() => setDraft((currentDraft) => { const next = { ...currentDraft }; delete next[definition.action]; return next; })} title="清除自定义值" className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-3.5" /></button></div>;
        })}</div>}
      </Section>
      <SaveBar dirty={dirty} saving={live.saving} onSave={() => void save()} onReset={reset} />

      {capturing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><h3 className="text-[15px] text-slate-900">录入快捷键 · {labels[capturing] ?? capturing}</h3><p className="mt-1 text-[12px] text-slate-400">在下方区域按下新的组合键；系统保留组合和与其他操作冲突的组合不会保存。</p><div tabIndex={0} autoFocus onKeyDown={capture} className={`mt-3 grid h-16 place-items-center rounded-xl border-2 border-dashed outline-none ${valid ? "border-emerald-300 bg-emerald-50" : conflict || reserved ? "border-rose-300 bg-rose-50" : "border-slate-300 bg-slate-50"}`}><span className="font-mono text-[18px] text-slate-800">{formattedPending || "等待按键…"}</span></div>{conflict && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-rose-700"><AlertTriangle className="size-4" />与「{labels[conflict.action] ?? conflict.action}」冲突。</div>}{reserved && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-rose-700"><AlertTriangle className="size-4" />该组合被当前系统保留。</div>}{valid && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-700"><Check className="size-4" />按键有效。</div>}<div className="mt-4 flex justify-end gap-2"><button onClick={() => { setCapturing(null); setPending(null); }} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200">取消</button><button onClick={applyCapture} disabled={!valid} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white disabled:opacity-40">确认</button></div></div></div>}

      <ConfirmDialog open={resetAll} title="恢复全部默认值" tone="amber" confirmText="全部恢复" onConfirm={() => { setDraft({}); setResetAll(false); }} onCancel={() => setResetAll(false)}>将清除所有自定义快捷键；点击保存并收到后端确认后才会持久化。</ConfirmDialog>
    </SettingsBody>
  );
}
