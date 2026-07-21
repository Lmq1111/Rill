import { useState } from "react";
import {
  Search, Plus, FolderPlus, FolderGit2, ChevronDown, ChevronRight, Bot, Clock3, Circle,
  Boxes, History, Trash2, Workflow, Settings, Lock, X, Pencil, Check, GitFork,
} from "lucide-react";
import { useStore, type Session, type Route, type Project } from "../../state/visualStore";
import { brand } from "../../../lib/brand";

const sourceMeta = {
  local: { icon: Circle, tone: "text-slate-400" },
  bot: { icon: Bot, tone: "text-violet-500" },
  schedule: { icon: Clock3, tone: "text-amber-500" },
} as const;

export function sessionsForProjectSearch(project: Project, sessions: readonly Session[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  const projectMatches = normalized !== "" && project.name.toLocaleLowerCase().includes(normalized);
  return sessions.filter((session) => session.projectId === project.id && (
    normalized === ""
    || projectMatches
    || session.title.toLocaleLowerCase().includes(normalized)
    || session.summary.toLocaleLowerCase().includes(normalized)
  ));
}

function SessionRow({ session }: { session: Session }) {
  const { activeSessionId, setActiveSession, deleteSession, closeSession, renameSession } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(session.title);
  const active = session.id === activeSessionId;
  const meta = sourceMeta[session.source];
  const SourceIcon = meta.icon;
  const running = session.runState === "aiRunning";
  const readonly = session.runState === "readonly";
  return (
    <div className={["group relative w-full rounded-lg transition-colors", active ? "bg-white shadow-sm ring-1 ring-teal-200" : "hover:bg-white/70"].join(" ")}>
      <button onClick={() => setActiveSession(session.id)} className="flex w-full items-start gap-2.5 px-2.5 py-2 text-left">
        <SourceIcon className={["mt-0.5 shrink-0", session.source === "local" ? "size-2.5 fill-current" : "size-4", active ? "text-teal-600" : meta.tone].join(" ")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {renaming ? (
              <input
                aria-label="会话名称"
                value={title}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void renameSession(session.id, title).then((ok) => ok && setRenaming(false));
                  if (event.key === "Escape") { setTitle(session.title); setRenaming(false); }
                }}
                className="min-w-0 flex-1 rounded border border-teal-200 bg-white px-1 text-[12px] outline-none"
              />
            ) : <span className={["truncate text-[13px]", active ? "text-slate-900" : "text-slate-700"].join(" ")}>{session.title}</span>}
            {readonly && <Lock className="size-3 shrink-0 text-slate-400" />}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
            <span>{session.updatedAt}</span>
            {running && <span className="flex items-center gap-1 text-teal-600"><span className="size-1.5 rounded-full bg-teal-500 animate-pulse" />运行中</span>}
            {session.runState === "failed" && <span className="text-rose-500">执行失败</span>}
            {session.runState === "awaitingConfirm" && <span className="text-amber-600">待确认</span>}
          </div>
        </div>
        {session.unread ? <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full bg-teal-600 text-[10px] text-white">{session.unread}</span> : null}
      </button>
      <div style={{ gridAutoFlow: "column" }} className="absolute right-1.5 top-1.5 hidden items-center gap-0.5 rounded-md bg-white/95 pl-0.5 shadow-sm group-hover:grid">
        {renaming ? (
          <button onClick={() => void renameSession(session.id, title).then((ok) => ok && setRenaming(false))} title="保存会话名称" className="grid size-6 place-items-center rounded-md text-teal-600 hover:bg-teal-50"><Check className="size-3.5" /></button>
        ) : (
          <button onClick={() => setRenaming(true)} title="重命名会话" className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-teal-600"><Pencil className="size-3.5" /></button>
        )}
        <button onClick={() => void closeSession(session.id)} title="关闭会话" className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-3.5" /></button>
        <button onClick={() => deleteSession(session.id)} title="移入回收站" className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="size-3.5" /></button>
      </div>
    </div>
  );
}

function AddProjectDialog({ mode, onClose }: { mode: "existing" | "blank"; onClose: () => void }) {
  const { addProject } = useStore();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2"><FolderGit2 className="size-4 text-teal-600" /><span className="text-[14px] text-slate-900">{mode === "existing" ? "添加已有项目" : "创建空白项目"}</span><button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X className="size-4" /></button></div>
        <label className="block"><span className="text-[12px] text-slate-500">项目名称</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如 rill-docs" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" /></label>
        <label className="mt-3 block"><span className="text-[12px] text-slate-500">{mode === "existing" ? "本地 Git 目录" : "新建目录"}</span><input value={path} onChange={(e) => setPath(e.target.value)} placeholder="~/work/rill/…" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg bg-white px-3 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
          <button disabled={!name.trim() || !path.trim()} onClick={() => { addProject({ name: name.trim(), path: path.trim(), branch: mode === "existing" ? "main" : "main" }); onClose(); }} className="rounded-lg bg-teal-600 px-3 py-1.5 text-[13px] text-white hover:bg-teal-700 disabled:opacity-40">{mode === "existing" ? "添加" : "创建"}</button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { navigate, params, sessions, active, projects, toggleProject, createSession, createIsolatedWorkspace, recycled, tasks } = useStore();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<null | "existing" | "blank">(
    params.rillVisualState === "add-project-dialog" ? "existing" : null,
  );

  const filtered = (project: Project) => sessionsForProjectSearch(project, sessions, query);

  const navEntries: { id: Route; label: string; icon: typeof History; badge?: number }[] = [
    { id: "history", label: "历史记录", icon: History },
    { id: "recycle", label: "回收站", icon: Trash2, badge: recycled.length || undefined },
    { id: "automation", label: "自动化任务", icon: Workflow, badge: tasks.filter((t) => t.enabled).length || undefined },
    { id: "settings", label: "设置", icon: Settings },
  ];

  return (
    <aside className="flex w-[288px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/80">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm"><Boxes className="size-[18px]" /></div>
        <div className="leading-tight"><div className="text-[15px] font-medium text-slate-900">{brand.productName}</div><div className="text-[11px] tracking-wide text-slate-400">{brand.cliBrand} Workbench</div></div>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
          <Search className="size-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索项目或会话" className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400" />
          {query && <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600"><X className="size-3.5" /></button>}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pb-2">
        <button onClick={() => createSession(active.projectId)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-[13px] text-white hover:bg-teal-700"><Plus className="size-4" />新建会话</button>
        <button onClick={() => setDialog("existing")} className="grid size-[38px] place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:text-teal-600 hover:ring-teal-300" title="添加已有项目"><FolderGit2 className="size-4" /></button>
        <button onClick={() => setDialog("blank")} className="grid size-[38px] place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:text-teal-600 hover:ring-teal-300" title="创建空白项目"><FolderPlus className="size-4" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {projects.map((project, i) => {
          const list = filtered(project);
          if (query !== "" && list.length === 0) return null;
          return (
            <div key={project.id} className={`group ${i > 0 ? "mt-2" : ""}`}>
              <button onClick={() => toggleProject(project.id)} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left">
                {project.expanded ? <ChevronDown className="size-3.5 text-slate-400" /> : <ChevronRight className="size-3.5 text-slate-400" />}
                <FolderGit2 className="size-3.5 text-slate-400" />
                <span className="truncate text-[12px] font-medium text-slate-500">{project.name}</span>
                {project.isolated && <span className="rounded bg-cyan-50 px-1 py-0.5 text-[9px] text-cyan-600">隔离</span>}
                {project.status === "unavailable" && <span className="rounded bg-rose-50 px-1 py-0.5 text-[9px] text-rose-500">不可用</span>}
                {!project.isolated && project.id !== "global" && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="创建隔离工作区"
                    aria-label={`为${project.name}创建隔离工作区`}
                    onClick={(event) => { event.stopPropagation(); void createIsolatedWorkspace(project.id); }}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.stopPropagation(); void createIsolatedWorkspace(project.id); } }}
                    className="hidden size-5 place-items-center rounded text-slate-400 hover:bg-cyan-50 hover:text-cyan-600 group-hover:grid"
                  ><GitFork className="size-3.5" /></span>
                )}
                <span className="ml-auto rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-slate-500">{list.length}</span>
              </button>
              {(project.expanded || query !== "") && (
                <div className="space-y-0.5">
                  {list.map((s) => <SessionRow key={s.id} session={s} />)}
                  {list.length === 0 && <div className="px-3 py-1.5 text-[11px] text-slate-400">暂无会话</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 p-2">
        <div className="grid grid-cols-2 gap-1">
          {navEntries.map((entry) => {
            const Icon = entry.icon;
            return (
              <button key={entry.id} onClick={() => entry.id === "settings" ? navigate("settings", { tab: "general" }) : navigate(entry.id)} className="relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-slate-600 hover:bg-white hover:text-slate-900">
                <Icon className="size-4 text-slate-400" />{entry.label}
                {entry.badge ? <span className="absolute right-2 top-1.5 grid size-4 place-items-center rounded-full bg-amber-500 text-[9px] text-white">{entry.badge}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {dialog && <AddProjectDialog mode={dialog} onClose={() => setDialog(null)} />}
    </aside>
  );
}
