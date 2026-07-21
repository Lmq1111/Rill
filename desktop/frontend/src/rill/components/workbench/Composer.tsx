import { useState } from "react";
import {
  Paperclip, Image as ImageIcon, AtSign, Slash, Send, Square, ChevronDown,
  Cpu, Gauge, Play, Users, ShieldCheck, X, Lock, Copy, Download, FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import { brand } from "../../../lib/brand";
import { useStore, type SessionSettings } from "../../state/visualStore";

const OPTIONS: Record<keyof SessionSettings, string[]> = {
  model: ["Opus 4.8", "Sonnet 4.6", "Haiku 4.5"],
  reasoning: ["高", "中", "低"],
  exec: ["自动", "手动"],
  collab: ["结对", "监督", "自动"],
  permission: ["需确认", "按风险确认", "自动"],
};

function Control({ icon: Icon, label, k, value }: { icon: typeof Cpu; label: string; k: keyof SessionSettings; value: string }) {
  const { active, params, setSetting } = useStore();
  const [open, setOpen] = useState(params.rillVisualState === "composer-model-menu" && k === "model");
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-slate-600 hover:bg-slate-100">
        <Icon className="size-3.5 text-slate-400" /><span className="text-slate-400">{label}</span><span className="text-slate-700">{value}</span><ChevronDown className="size-3 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-1 w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {OPTIONS[k].map((o) => (
              <button key={o} onClick={() => { setSetting(active.id, k, o); setOpen(false); }} className={`block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-slate-50 ${o === value ? "text-teal-700" : "text-slate-600"}`}>{o}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const refIcon = { file: FileCode2, snippet: FileCode2, path: AtSign, diff: FileCode2, diffSnippet: FileCode2 };

export function Composer() {
  const { active, setDraft, sendMessage, stopRun, removeRef, addAttachment, removeAttachment, navigate } = useStore();
  const s = active;
  const readonly = s.runState === "readonly";
  const running = s.runState === "aiRunning";
  const blocked = s.runState === "awaitingConfirm" || s.runState === "awaitingAnswer";

  if (readonly) {
    return (
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] text-slate-500"><Lock className="size-4 text-slate-400" />只读历史会话：不能继续发送消息或修改原始记录</div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast.success("已复制会话")} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Copy className="size-3.5" /> 复制</button>
            <button onClick={() => toast.success("已导出会话")} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Download className="size-3.5" /> 导出</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 bg-white/80 px-5 py-3 backdrop-blur">
      <div className="mx-auto w-full max-w-3xl">
        {running && <div className="mb-2 flex items-center gap-2 text-[11.5px] text-teal-600"><span className="size-1.5 rounded-full bg-teal-500 animate-pulse" />{brand.productName}正在运行 —— 你可以补充指令，或点击停止</div>}
        {blocked && <div className="mb-2 flex items-center gap-2 text-[11.5px] text-amber-600"><ShieldCheck className="size-3.5" />请先在对话中回应待确认 / 待回答项，再继续发送</div>}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100">
          {(s.refs.length > 0 || s.attachments.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5">
              {s.refs.map((r) => {
                const I = refIcon[r.kind];
                return (
                  <span key={r.id} className="flex items-center gap-1.5 rounded-md bg-slate-100 py-1 pl-2 pr-1 text-[11.5px] text-slate-600">
                    <I className="size-3 text-slate-400" />{r.label}
                    <button onClick={() => removeRef(s.id, r.id)} className="grid size-4 place-items-center rounded hover:bg-slate-200"><X className="size-3" /></button>
                  </span>
                );
              })}
              {s.attachments.map((a) => (
                <span key={a.id} className="flex items-center gap-1.5 rounded-md bg-sky-50 py-1 pl-2 pr-1 text-[11.5px] text-sky-700">
                  <Paperclip className="size-3" />{a.name} · {a.size}
                  <button onClick={() => removeAttachment(s.id, a.id)} className="grid size-4 place-items-center rounded hover:bg-sky-100"><X className="size-3" /></button>
                </span>
              ))}
            </div>
          )}

          <textarea
            value={s.draft}
            onChange={(e) => setDraft(s.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendMessage(s.id); } }}
            rows={2}
            placeholder="输入消息，粘贴长文本，/ 唤起命令，@ 引用文件…（⌘/Ctrl + Enter 发送）"
            className="w-full resize-none bg-transparent px-3.5 py-2.5 text-[13.5px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
          />

          <div className="flex items-center gap-1 border-t border-slate-100 px-2.5 py-2">
            <button onClick={() => addAttachment(s.id, { id: `at${Date.now()}`, name: `附件-${s.attachments.length + 1}.txt`, kind: "file", size: "12 KB" })} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="附件"><Paperclip className="size-4" /></button>
            <button onClick={() => addAttachment(s.id, { id: `im${Date.now()}`, name: `截图-${s.attachments.length + 1}.png`, kind: "image", size: "88 KB" })} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="图片"><ImageIcon className="size-4" /></button>
            <button onClick={() => setDraft(s.id, s.draft + "/")} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="斜杠命令"><Slash className="size-4" /></button>
            <button onClick={() => navigate("files")} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="引用文件"><AtSign className="size-4" /></button>

            <div className="ml-auto flex items-center gap-2">
              {running && <button onClick={() => stopRun(s.id)} className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[13px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100"><Square className="size-3.5 fill-current" /> 停止</button>}
              <button
                onClick={() => void sendMessage(s.id)}
                disabled={!s.draft.trim() || blocked}
                title={running ? "发送补充指令" : "发送"}
                aria-label={running ? "发送补充指令" : "发送"}
                className="grid size-9 place-items-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
              ><Send className="size-4" /></button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Control icon={Cpu} label="模型" k="model" value={s.settings.model} />
          <Control icon={Gauge} label="推理" k="reasoning" value={s.settings.reasoning} />
          <Control icon={Play} label="执行" k="exec" value={s.settings.exec} />
          <Control icon={Users} label="协作" k="collab" value={s.settings.collab} />
          <Control icon={ShieldCheck} label="权限" k="permission" value={s.settings.permission} />
        </div>
      </div>
    </div>
  );
}
