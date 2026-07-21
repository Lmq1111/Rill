import { useEffect, useState } from "react";
import {
  Trash2, Search, RotateCcw, AlertTriangle, ShieldAlert, Bot, Clock3, Circle,
  History as HistoryIcon, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "./PageShell";
import { useStore, projectName, type Recycled } from "../../state/visualStore";

type Confirm =
  | { kind: "one"; id: string; title: string }
  | { kind: "batch"; ids: string[] }
  | { kind: "empty" }
  | null;

type DeleteTime = "all" | "day" | "week" | "month";

export function filterRecycledSessions(entries: readonly Recycled[], query: string, deletionTime: DeleteTime, now = Date.now()) {
  const needle = query.trim().toLocaleLowerCase();
  const maxAge = deletionTime === "day" ? 86_400_000 : deletionTime === "week" ? 7 * 86_400_000 : deletionTime === "month" ? 30 * 86_400_000 : Number.POSITIVE_INFINITY;
  return entries.filter((entry) => {
    if (needle && !`${entry.title}\n${entry.summary}`.toLocaleLowerCase().includes(needle)) return false;
    if (Number.isFinite(maxAge) && (!entry.deletedAtMs || now - entry.deletedAtMs > maxAge)) return false;
    return true;
  });
}

export function Recycle() {
  const { recycled, projects, params, restoreFromRecycle, permanentDelete, permanentDeleteMany, emptyRecycle, cleanRestoreCopies, navigate, recycleLoading, recycleError, refreshRecycle } = useStore();
  const [query, setQuery] = useState("");
  const [deletionTime, setDeletionTime] = useState<DeleteTime>("all");
  const [selectedId, setSelectedId] = useState<string | null>(recycled[0]?.id ?? null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoreProjectId, setRestoreProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(() =>
    params.rillVisualState === "recycle-permanent-delete-confirmation" && recycled[0]
      ? { kind: "one", id: recycled[0].id, title: recycled[0].title }
      : null,
  );

  const list = filterRecycledSessions(recycled, query, deletionTime);
  const selected = recycled.find((s) => s.id === selectedId) ?? null;
  const restoring = recycled.find((entry) => entry.id === restoreId) ?? null;
  const restoringProjectAvailable = Boolean(restoring && (restoring.projectId === "global" || projects.some((project) => project.id === restoring.projectId && project.status === "ok")));
  const toggleCheck = (id: string) => setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  useEffect(() => {
    if (!recycled.some((entry) => entry.id === selectedId)) setSelectedId(recycled[0]?.id ?? null);
    setChecked((current) => new Set([...current].filter((id) => recycled.some((entry) => entry.id === id))));
  }, [recycled, selectedId]);

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "one") {
        if (await permanentDelete(confirm.id)) setConfirm(null);
      } else if (confirm.kind === "batch") {
        const { failed } = await permanentDeleteMany(confirm.ids);
        setChecked(new Set(failed));
        if (failed.length === 0) setConfirm(null);
        else setConfirm({ kind: "batch", ids: failed });
      } else if (await emptyRecycle()) setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (action: "stay" | "history" | "open") => {
    if (!restoring) return;
    setBusy(true);
    try {
      if (await restoreFromRecycle(restoring.id, action, restoreProjectId || undefined)) setRestoreId(null);
    } finally {
      setBusy(false);
    }
  };

  const confirmCount = confirm?.kind === "empty" ? recycled.length : confirm?.kind === "batch" ? confirm.ids.length : 1;

  return (
    <PageShell icon={Trash2} title="回收站" subtitle="恢复误删会话或永久清理数据"
      actions={
        <>
          {checked.size > 0 && (
            <button onClick={() => setConfirm({ kind: "batch", ids: [...checked] })} className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[12px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100">
              <Trash2 className="size-3.5" /> 批量永久删除 ({checked.size})
            </button>
          )}
          {recycled.some((entry) => entry.restoreCopy) && (
            <button onClick={() => { void cleanRestoreCopies(); }} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
              <RotateCcw className="size-3.5" /> 清理恢复副本
            </button>
          )}
          <button onClick={() => recycled.length ? setConfirm({ kind: "empty" }) : toast("回收站已空")} disabled={recycled.length === 0} className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[12px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50">
            <ShieldAlert className="size-4" /> 清空回收站
          </button>
        </>
      }>
      <div className="flex h-full">
        <div className="flex w-[440px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
              <Search className="size-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索已删除会话" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
              {query && <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600"><X className="size-3.5" /></button>}
            </div>
            <select value={deletionTime} onChange={(event) => setDeletionTime(event.target.value as DeleteTime)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600"><option value="all">全部删除时间</option><option value="day">最近 24 小时</option><option value="week">最近 7 天</option><option value="month">最近 30 天</option></select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {recycleLoading ? <div className="grid h-full place-items-center p-8 text-[13px] text-slate-400">正在加载回收站…</div> : recycleError ? <div className="grid h-full place-items-center p-8 text-center text-[13px] text-rose-600"><div>{recycleError}<button onClick={() => void refreshRecycle()} className="mt-3 block rounded-lg bg-white px-3 py-1.5 ring-1 ring-rose-200">重新加载</button></div></div> : list.length === 0 ? (
              <div className="grid h-full place-items-center p-8 text-center text-[13px] text-slate-400">{recycled.length === 0 ? "回收站为空" : "没有匹配的搜索结果"}</div>
            ) : list.map((s) => <RecycleRow key={s.id} s={s} projectLabel={projectName(projects, s.projectId)} active={s.id === selectedId} checked={checked.has(s.id)} onCheck={() => toggleCheck(s.id)} onSelect={() => setSelectedId(s.id)} />)}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
          {selected ? (
            <>
              <div className="flex items-start gap-3 border-b border-slate-200 bg-white p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] text-slate-900">{selected.title}</h2>
                  <div className="mt-0.5 text-[12px] text-slate-400">原属 {projectName(projects, selected.projectId)} · {selected.snapshot.context.rounds} 轮 · 删除于 {selected.deletedAt}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => { setRestoreId(selected.id); setRestoreProjectId(""); }} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[13px] text-white hover:bg-teal-700"><RotateCcw className="size-4" /> 恢复</button>
                  <button onClick={() => setConfirm({ kind: "one", id: selected.id, title: selected.title })} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[13px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"><Trash2 className="size-4" /> 永久删除</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-2xl space-y-3">
                  <div className="rounded-lg bg-white p-3 text-[13px] text-slate-700 ring-1 ring-slate-200">{selected.summary}</div>
                  {selected.snapshot.messages.filter((m) => m.type === "user" || m.type === "ai").map((m) => (
                    m.type === "user"
                      ? <div key={m.id} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-teal-600 px-3.5 py-2 text-[13px] text-white">{m.text}</div></div>
                      : <div key={m.id} className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-[13px] text-slate-700 ring-1 ring-slate-200">{m.text}</div>
                  ))}
                  <div className="rounded-lg border border-dashed border-slate-200 p-3 text-[12px] text-slate-400">（只读预览）已删除会话内容仅供确认，恢复后可继续使用。</div>
                </div>
              </div>
            </>
          ) : <div className="grid h-full place-items-center text-[13px] text-slate-400">选择左侧会话以预览</div>}
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600"><AlertTriangle className="size-5" /><h3 className="text-[15px] text-slate-900">{confirm.kind === "empty" ? "清空回收站" : confirm.kind === "batch" ? "批量永久删除" : "永久删除会话"}</h3></div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              {confirm.kind === "one"
                ? <>会话「{confirm.title}」将被<b className="text-rose-600">永久删除且不可恢复</b>，请再次确认。</>
                : <>此操作将 <b className="text-rose-600">永久删除且不可恢复</b> {confirmCount} 个会话。请再次确认。</>}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
              <button onClick={() => { void doConfirm(); }} disabled={busy} className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-rose-700 disabled:opacity-50">{busy ? "处理中…" : "确认永久删除"}</button>
            </div>
          </div>
        </div>
      )}

      {restoring && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 text-teal-700"><RotateCcw className="size-5" /><h3 className="text-[15px] text-slate-900">恢复会话</h3></div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">恢复「{restoring.title}」后请选择下一步。</p>
            {!restoringProjectAvailable && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-700 ring-1 ring-amber-200">
                原项目已不可用，请选择一个有效项目后再恢复。
                <select value={restoreProjectId} onChange={(event) => setRestoreProjectId(event.target.value)} className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-slate-700">
                  <option value="">选择项目</option>
                  {projects.filter((project) => project.status === "ok" && project.id !== "global").map((project) => <option key={project.id} value={project.id}>{project.name} · {project.path}</option>)}
                </select>
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={() => setRestoreId(null)} disabled={busy} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200">取消</button>
              <button onClick={() => { void doRestore("stay"); }} disabled={busy || (!restoringProjectAvailable && !restoreProjectId)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-50">恢复并留在此页</button>
              <button onClick={() => { void doRestore("history"); }} disabled={busy || (!restoringProjectAvailable && !restoreProjectId)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-teal-700 ring-1 ring-teal-200 disabled:opacity-50">进入历史</button>
              <button onClick={() => { void doRestore("open"); }} disabled={busy || (!restoringProjectAvailable && !restoreProjectId)} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white disabled:opacity-50">打开会话</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate("history")} className="fixed bottom-5 right-5 flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[12px] text-slate-600 shadow-md ring-1 ring-slate-200 hover:bg-slate-50"><HistoryIcon className="size-4" /> 返回历史记录</button>
    </PageShell>
  );
}

const srcIcon = { local: Circle, bot: Bot, schedule: Clock3 } as const;

function RecycleRow({ s, projectLabel, active, checked, onCheck, onSelect }: { s: Recycled; projectLabel: string; active: boolean; checked: boolean; onCheck: () => void; onSelect: () => void }) {
  const Icon = srcIcon[s.source];
  return (
    <div onClick={onSelect} className={["mb-1 flex cursor-pointer items-start gap-2.5 rounded-lg p-2.5", active ? "bg-teal-50 ring-1 ring-teal-200" : "hover:bg-slate-50"].join(" ")}>
      <input type="checkbox" checked={checked} onChange={onCheck} onClick={(e) => e.stopPropagation()} className="mt-1 accent-teal-600" />
      <Icon className={s.source === "local" ? "mt-1.5 size-2 fill-current text-slate-400" : "mt-1 size-3.5 text-slate-400"} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-slate-800">{s.title}{s.restoreCopy && <span className="ml-1.5 rounded bg-slate-100 px-1 text-[10px] text-slate-500">副本</span>}</div>
        <div className="truncate text-[11.5px] text-slate-400">{s.summary}</div>
        <div className="mt-0.5 text-[10.5px] text-slate-400">原属 {projectLabel} · 删除于 {s.deletedAt}</div>
      </div>
    </div>
  );
}
