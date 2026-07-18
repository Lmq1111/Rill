import { useState } from "react";
import {
  Sparkles, User, Brain, ChevronDown, Terminal, FileCode2, CheckCircle2, Circle,
  Loader2, AlertTriangle, RotateCcw, ShieldAlert, HelpCircle, Info, Archive, Lock,
  Check, X, Square,
} from "lucide-react";
import { useStore, type Session, type Message, projectName } from "../../state/visualStore";
import { brand } from "../../../lib/brand";

function AiHeader({ model, reasoning }: { model: string; reasoning: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
        <Sparkles className="size-4" />
      </div>
      <span className="text-[13px] text-slate-900">{brand.productName}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{model} · {reasoning}推理</span>
    </div>
  );
}

function UserMessage({ m }: { m: Message }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[76%] rounded-2xl rounded-tr-sm bg-teal-600 px-4 py-2.5 text-[13.5px] leading-relaxed text-white whitespace-pre-wrap">
        {m.text}
        {m.refs && m.refs.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 border-t border-white/20 pt-1.5 text-[11px] text-teal-100">
            <FileCode2 className="size-3" /> 引用 {m.refs.join(" · ")}
          </div>
        )}
      </div>
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-500"><User className="size-4" /></div>
    </div>
  );
}

function Reasoning({ thought }: { thought: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-slate-500">
        <Brain className="size-3.5 text-indigo-400" />推理过程
        <ChevronDown className={`ml-auto size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-slate-200 px-3 py-2.5 text-[12px] leading-relaxed text-slate-500">{thought}</div>}
    </div>
  );
}

function ToolCall({ m }: { m: Message }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 text-[12px] text-slate-100">
        <Terminal className="size-3.5 text-teal-400" />
        <span className="font-mono">{m.tool}</span>
        <span className="text-slate-400 truncate">{m.cmd}</span>
        <span className={`ml-auto flex shrink-0 items-center gap-1 ${m.ok ? "text-teal-400" : "text-rose-400"}`}>
          {m.ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}{m.ok ? "成功" : "失败"}
        </span>
      </div>
      {m.out && <pre className="overflow-x-auto bg-slate-900 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-slate-300 whitespace-pre-wrap">{m.out}</pre>}
    </div>
  );
}

function CodeResult({ m }: { m: Message }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 text-[12px] text-slate-600">
        <FileCode2 className="size-3.5 text-teal-600" />
        <span className="font-mono truncate">{m.file}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px]">
          <span className="text-emerald-600">+{m.added}</span><span className="text-rose-500">-{m.removed}</span>
        </span>
      </div>
      <pre className="overflow-x-auto bg-white px-3 py-2.5 font-mono text-[11.5px] leading-relaxed">
        {m.codeLines?.map((l, i) => (
          <div key={i} className={l.kind === "add" ? "bg-emerald-50 text-emerald-700" : l.kind === "del" ? "bg-rose-50 text-rose-600" : "text-slate-400"}>{l.t}</div>
        ))}
      </pre>
    </div>
  );
}

function TaskList({ m }: { m: Message }) {
  const done = m.tasks?.filter((t) => t.state === "done").length ?? 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-500">
        <CheckCircle2 className="size-3.5 text-teal-600" />任务清单
        <span className="ml-auto text-slate-400">{done} / {m.tasks?.length}</span>
      </div>
      <div className="space-y-1.5">
        {m.tasks?.map((task) => (
          <div key={task.t} className="flex items-center gap-2 text-[13px]">
            {task.state === "done" ? <CheckCircle2 className="size-4 text-teal-600" /> : task.state === "running" ? <Loader2 className="size-4 animate-spin text-amber-500" /> : <Circle className="size-4 text-slate-300" />}
            <span className={task.state === "done" ? "text-slate-400 line-through" : task.state === "running" ? "text-slate-900" : "text-slate-600"}>{task.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notice({ m }: { m: Message }) {
  return (
    <div className="flex items-center justify-center">
      <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] ${m.tone ?? "bg-slate-100 text-slate-500"}`}>
        <Info className="size-3.5" />{m.text}
      </div>
    </div>
  );
}

function AiText({ m }: { m: Message }) {
  return <p className="text-[13.5px] leading-relaxed text-slate-700 whitespace-pre-wrap">{m.text}</p>;
}

function AnsweredChip({ m }: { m: Message }) {
  return (
    <div className="flex justify-end">
      <span className="rounded-lg bg-sky-50 px-3 py-1.5 text-[12.5px] text-sky-700 ring-1 ring-sky-200">已回答：{m.text}</span>
    </div>
  );
}

function ErrorBubble({ m }: { m: Message }) {
  return (
    <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-4">
      <div className="mb-1.5 flex items-center gap-2"><AlertTriangle className="size-4 text-rose-600" /><span className="text-[13px] text-rose-900">工具调用失败</span></div>
      <p className="font-mono text-[12px] leading-relaxed text-rose-800/80">{m.text}</p>
    </div>
  );
}

function renderMessage(m: Message, s: Session) {
  switch (m.type) {
    case "user": return <UserMessage m={m} />;
    case "answered": return <AnsweredChip m={m} />;
    case "notice": case "compress": return <Notice m={m} />;
    case "reasoning": return <div className="pl-11"><Reasoning thought={m.thought ?? ""} /></div>;
    case "tool": case "output": return <div className="pl-11"><ToolCall m={m} /></div>;
    case "code": return <div className="pl-11"><CodeResult m={m} /></div>;
    case "tasklist": return <div className="pl-11"><TaskList m={m} /></div>;
    case "error": return <div className="pl-11"><ErrorBubble m={m} /></div>;
    case "ai": return (
      <div>
        <AiHeader model={s.settings.model} reasoning={s.settings.reasoning} />
        <div className="pl-11"><AiText m={m} /></div>
      </div>
    );
    default: return null;
  }
}

/* ---------- 交互流程卡片（真实改变状态） ---------- */

function ConfirmationCard({ s }: { s: Session }) {
  const { resolveConfirm, navigate } = useStore();
  const c = s.pendingConfirm!;
  return (
    <div className="pl-11">
      <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-600" />
          <span className="text-[13px] text-amber-900">等待人工确认 · {c.op}</span>
          <span className="ml-auto rounded bg-amber-200/70 px-2 py-0.5 text-[11px] text-amber-800">高权限操作</span>
        </div>
        <p className="text-[13px] leading-relaxed text-amber-900/80">
          {brand.productName}准备执行 <code className="rounded bg-amber-100 px-1 font-mono text-[12px]">{c.command}</code>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-amber-900/80">
          <div>影响范围：{c.scope}</div><div>工作目录：{c.workdir}</div>
          <div className="col-span-2">风险：{c.risk}</div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => resolveConfirm(s.id, true)} className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-amber-700"><Check className="size-4" /> 允许执行</button>
          <button onClick={() => resolveConfirm(s.id, false)} className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><X className="size-4" /> 拒绝</button>
          <button onClick={() => navigate("changes")} className="ml-auto text-[12px] text-amber-700 hover:underline">查看完整改动</button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ s }: { s: Session }) {
  const { answerQuestion } = useStore();
  const q = s.pendingQuestion!;
  return (
    <div className="pl-11">
      <div className="rounded-xl border border-sky-300 bg-sky-50/70 p-4">
        <div className="mb-2 flex items-center gap-2"><HelpCircle className="size-4 text-sky-600" /><span className="text-[13px] text-sky-900">{brand.productName}想向你确认</span></div>
        <p className="text-[13px] leading-relaxed text-sky-900/80">{q.q}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {q.options.map((o) => (
            <button key={o} onClick={() => answerQuestion(s.id, o)} className="rounded-lg bg-white px-3 py-1.5 text-[13px] text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100">{o}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorRetry({ s }: { s: Session }) {
  const { retry } = useStore();
  return (
    <div className="pl-11">
      <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-4">
        <div className="mb-1.5 flex items-center gap-2"><AlertTriangle className="size-4 text-rose-600" /><span className="text-[13px] text-rose-900">执行失败</span></div>
        <p className="font-mono text-[12px] leading-relaxed text-rose-800/80">{s.error ?? "任务执行失败。你的输入与上下文已保留。"}</p>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => retry(s.id, false)} className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-rose-700"><RotateCcw className="size-4" /> 重试</button>
          <button onClick={() => retry(s.id, true)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">切换模型重试</button>
        </div>
      </div>
    </div>
  );
}

function RunningIndicator({ s }: { s: Session }) {
  const { stopRun } = useStore();
  return (
    <div className="pl-11">
      <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-[12.5px] text-teal-700 ring-1 ring-teal-200">
        <Loader2 className="size-4 animate-spin" /> {brand.productName}正在输出…
        <button onClick={() => stopRun(s.id)} className="ml-auto flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Square className="size-3" /> 停止</button>
      </div>
    </div>
  );
}

/* ---------- 主体 ---------- */

export function Conversation() {
  const { active } = useStore();
  const s = active;

  if (s.runState === "empty" || s.messages.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 px-5 py-20 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white"><Sparkles className="size-6" /></div>
        <div className="text-[15px] text-slate-800">开始一个新会话</div>
        <p className="max-w-sm text-[13px] leading-relaxed text-slate-500">当前会话（{projectName(s.projectId)}）还没有对话。在下方输入你的第一条消息，草稿与运行状态都独立于其他会话。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-6">
      {s.runState === "readonly" && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11.5px] text-slate-500"><Lock className="size-3.5" /> 只读历史会话 · 不可继续编辑</div>
        </div>
      )}

      {s.messages.map((m) => <div key={m.id}>{renderMessage(m, s)}</div>)}

      {s.runState === "aiRunning" && <RunningIndicator s={s} />}
      {s.runState === "awaitingAnswer" && s.pendingQuestion && <QuestionCard s={s} />}
      {s.runState === "awaitingConfirm" && s.pendingConfirm && <ConfirmationCard s={s} />}
      {s.runState === "failed" && <ErrorRetry s={s} />}

      {s.messages.some((m) => m.type === "compress") && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11.5px] text-indigo-500"><Archive className="size-3.5" /> 上下文已压缩</div>
        </div>
      )}
    </div>
  );
}
