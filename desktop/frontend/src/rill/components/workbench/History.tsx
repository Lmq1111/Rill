import { useEffect, useState } from "react";
import {
  History as HistoryIcon, Search, RotateCcw, Pencil, Trash2, Bot, Clock3, Circle,
  Lock, AlertTriangle, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "./PageShell";
import { useStore, projectName, runMeta, type Session } from "../../state/visualStore";

const statuses = ["全部状态", "运行中", "只读", "普通历史"];

export interface HistoryFilter {
  query: string;
  projectId: "all" | string;
  source: "all" | Session["source"];
  activity: "all" | "day" | "week" | "month";
  now?: number;
}

export function filterHistorySessions(sessions: readonly Session[], projects: readonly import("../../state/visualStore").Project[], filter: HistoryFilter) {
  const query = filter.query.trim().toLocaleLowerCase();
  const maxAge = filter.activity === "day" ? 86_400_000 : filter.activity === "week" ? 7 * 86_400_000 : filter.activity === "month" ? 30 * 86_400_000 : Number.POSITIVE_INFINITY;
  const now = filter.now ?? Date.now();
  return sessions.filter((session) => {
    const project = projects.find((candidate) => candidate.id === session.projectId);
    const searchable = [
      session.title,
      session.summary,
      project?.name,
      project?.path,
      session.source,
      session.sourceDetail,
      ...session.messages.map((message) => message.text ?? message.out ?? message.cmd ?? ""),
    ].join("\n").toLocaleLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (filter.projectId !== "all" && session.projectId !== filter.projectId) return false;
    if (filter.source !== "all" && session.source !== filter.source) return false;
    if (Number.isFinite(maxAge) && (!session.activityAt || now - session.activityAt > maxAge)) return false;
    return true;
  });
}

export function History() {
  const { historySessions, projects, active, activeSessionId, openSession, deleteSession, deleteSessions, renameSession, historyLoading, historyError, refreshHistory } = useStore();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [source, setSource] = useState<HistoryFilter["source"]>("all");
  const [activity, setActivity] = useState<HistoryFilter["activity"]>("all");
  const [status, setStatus] = useState(statuses[0]);
  const [selectedId, setSelectedId] = useState<string | null>(historySessions[0]?.id ?? null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const extendedHistoryFilters = historySessions.some((session) => session.activityAt != null);

  useEffect(() => {
    if (!historySessions.some((session) => session.id === selectedId)) setSelectedId(historySessions[0]?.id ?? null);
    setChecked((current) => new Set([...current].filter((id) => historySessions.some((session) => session.id === id))));
  }, [historySessions, selectedId]);

  // AI 正在输出时（当前会话）历史记录只读
  const aiBusy = active.runState === "aiRunning";

  const list = filterHistorySessions(historySessions, projects, { query, projectId: scope, source, activity }).filter((s) => {
    if (status === "运行中" && s.runState !== "aiRunning") return false;
    if (status === "只读" && s.runState !== "readonly") return false;
    if (status === "普通历史" && (s.runState === "aiRunning" || s.runState === "readonly")) return false;
    return true;
  });

  const selected = historySessions.find((s) => s.id === selectedId) ?? null;
  const guard = (fn: () => void) => { if (aiBusy) return toast.error("AI 正在输出，历史记录当前只能查看"); fn(); };
  const toggleCheck = (id: string) => setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <PageShell icon={HistoryIcon} title="历史记录" subtitle="检索、预览并恢复过去的会话"
      actions={
        <>
          {aiBusy && <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-[12px] text-amber-700 ring-1 ring-amber-200"><Lock className="size-3.5" />AI 输出中 · 只读</span>}
          {checked.size > 0 && !aiBusy && (
            <button onClick={() => guard(() => { void deleteSessions([...checked]).then(({ failed }) => setChecked(new Set(failed))); })} className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[12px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100">
              <Trash2 className="size-3.5" /> 批量删除 ({checked.size})
            </button>
          )}
        </>
      }>
      <div className="flex h-full">
        <div className="flex w-[440px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="space-y-2 border-b border-slate-200 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
              <Search className="size-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题、摘要、内容索引" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
              {query && <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600"><X className="size-3.5" /></button>}
            </div>
            <div className="flex gap-2">
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600"><option value="all">全部范围</option>{projects.filter((project) => project.id !== "global").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}<option value="global">全局</option></select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600">{statuses.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            {extendedHistoryFilters && <div className="flex gap-2">
              <select value={source} onChange={(event) => setSource(event.target.value as HistoryFilter["source"])} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600"><option value="all">全部来源</option><option value="local">本地</option><option value="bot">消息渠道</option><option value="schedule">自动化</option></select>
              <select value={activity} onChange={(event) => setActivity(event.target.value as HistoryFilter["activity"])} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600"><option value="all">全部时间</option><option value="day">最近 24 小时</option><option value="week">最近 7 天</option><option value="month">最近 30 天</option></select>
            </div>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {historyLoading ? <div className="grid h-full place-items-center p-8 text-[13px] text-slate-400">正在加载历史记录…</div> : historyError ? <div className="grid h-full place-items-center p-8 text-center text-[13px] text-rose-600"><div>{historyError}<button onClick={() => void refreshHistory()} className="mt-3 block rounded-lg bg-white px-3 py-1.5 ring-1 ring-rose-200">重新加载</button></div></div> : list.length === 0 ? (
              <div className="grid h-full place-items-center p-8 text-center text-[13px] text-slate-400">{historySessions.length === 0 ? "还没有历史会话" : "没有匹配的搜索结果"}</div>
            ) : list.map((s) => (
              <HistoryRow key={s.id} s={s} projectLabel={projectName(projects, s.projectId)} active={s.id === selectedId} isCurrent={s.id === activeSessionId} checked={checked.has(s.id)} disabled={aiBusy} onCheck={() => toggleCheck(s.id)} onSelect={() => guard(() => setSelectedId(s.id))} />
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
          {selected ? (
            <>
              <div className="flex items-start gap-3 border-b border-slate-200 bg-white p-4">
                <div className="min-w-0 flex-1">
                  {renaming === selected.id ? (
                    <div className="flex items-center gap-2">
                      <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="rounded-lg border border-teal-300 px-2 py-1 text-[14px] outline-none" />
                      <button onClick={() => { renameSession(selected.id, nameDraft.trim() || selected.title); setRenaming(null); }} className="grid size-7 place-items-center rounded-lg bg-teal-600 text-white"><Check className="size-4" /></button>
                      <button onClick={() => setRenaming(null)} className="grid size-7 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200"><X className="size-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[15px] text-slate-900">{selected.title}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${runMeta[selected.runState].cls}`}>{runMeta[selected.runState].label}</span>
                      {selected.id === activeSessionId && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-700 ring-1 ring-cyan-200">当前会话</span>}
                    </div>
                  )}
                  <div className="mt-0.5 text-[12px] text-slate-400">{projectName(projects, selected.projectId)} · {selected.context.rounds} 轮 · {selected.updatedAt}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => guard(() => { setRenaming(selected.id); setNameDraft(selected.title); })} className="grid size-8 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40" disabled={aiBusy} title="重命名"><Pencil className="size-4" /></button>
                  <button onClick={() => guard(() => { void deleteSession(selected.id); })} className="grid size-8 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40" disabled={aiBusy} title="删除（移入回收站）"><Trash2 className="size-4" /></button>
                  <button onClick={() => guard(() => { void openSession(selected.id); })} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[13px] text-white hover:bg-teal-700 disabled:opacity-40" disabled={aiBusy}><RotateCcw className="size-4" /> 恢复到主工作台</button>
                </div>
              </div>

              {aiBusy && <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-700"><AlertTriangle className="size-4" /> AI 正在输出，当前仅可查看，不能切换、恢复、重命名或删除。</div>}

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-2xl space-y-3">
                  <div className="rounded-lg bg-white p-3 text-[13px] text-slate-700 ring-1 ring-slate-200">{selected.summary}</div>
                  {selected.messages.filter((m) => m.type === "user" || m.type === "ai").map((m) => (
                    m.type === "user"
                      ? <div key={m.id} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-teal-600 px-3.5 py-2 text-[13px] text-white whitespace-pre-wrap">{m.text}</div></div>
                      : <div key={m.id} className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-[13px] text-slate-700 ring-1 ring-slate-200 whitespace-pre-wrap">{m.text}</div>
                  ))}
                  <div className="text-center text-[11px] text-slate-400">（只读预览）恢复到主工作台后可继续操作</div>
                </div>
              </div>
            </>
          ) : <div className="grid h-full place-items-center text-[13px] text-slate-400">选择左侧会话以预览</div>}
        </div>
      </div>
    </PageShell>
  );
}

const srcIcon = { local: Circle, bot: Bot, schedule: Clock3 } as const;

function HistoryRow({ s, projectLabel, active, isCurrent, checked, disabled, onCheck, onSelect }: {
  s: Session; projectLabel: string; active: boolean; isCurrent: boolean; checked: boolean; disabled: boolean; onCheck: () => void; onSelect: () => void;
}) {
  const Icon = srcIcon[s.source];
  const select = () => {
    if (!disabled) onSelect();
  };
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={select}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect();
        }
      }}
      className={["mb-1 flex cursor-pointer items-start gap-2.5 rounded-lg p-2.5", active ? "bg-teal-50 ring-1 ring-teal-200" : "hover:bg-slate-50"].join(" ")}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onCheck} onClick={(e) => e.stopPropagation()} className="mt-1 accent-teal-600" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className={s.source === "local" ? "size-2 fill-current text-slate-400" : "size-3.5 text-slate-400"} />
          <span className="truncate text-[13px] text-slate-800">{s.title}</span>
          {isCurrent && <span className="shrink-0 rounded bg-cyan-100 px-1 text-[10px] text-cyan-700">当前</span>}
          {s.runState === "aiRunning" && <span className="size-1.5 shrink-0 rounded-full bg-teal-500 animate-pulse" />}
          {s.runState === "readonly" && <Lock className="size-3 shrink-0 text-slate-400" />}
        </div>
        <div className="truncate text-[11.5px] text-slate-400">{s.summary}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-slate-400"><span>{projectLabel}</span><span>·</span><span>{s.context.rounds} 轮</span><span>·</span><span>{s.updatedAt}</span></div>
      </div>
    </div>
  );
}
