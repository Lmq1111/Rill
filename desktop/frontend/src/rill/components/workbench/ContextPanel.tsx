import { useState } from "react";
import { useStore, type DiffFile } from "../../state/visualStore";
import {
  Gauge, FileDiff, FileCode2, FilePlus2, FileX2, FileEdit, FileSymlink, Braces,
  MessageSquare, Wrench, Database, ChevronRight,
} from "lucide-react";

const tabs = [
  { id: "context", label: "上下文概览", icon: Gauge },
  { id: "changes", label: "文件和改动", icon: FileDiff },
] as const;

function ContextOverviewPanel() {
  const { active, navigate } = useStore();
  const c = active.context;
  const pct = Math.round((c.used / c.limit) * 100);
  const toolCount = active.messages.filter((m) => m.type === "tool" || m.type === "output").length;
  const refCount = active.refs.length;
  const items = [
    { icon: MessageSquare, label: "对话消息", value: `${active.messages.filter((m) => m.type === "user" || m.type === "ai").length} 条` },
    { icon: Wrench, label: "工具调用", value: `${toolCount} 次` },
    { icon: FileCode2, label: "引用文件", value: `${refCount} 个` },
    { icon: Database, label: "会话轮数", value: `${c.rounds} 轮` },
  ];
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-slate-500">上下文窗口占用</span>
          <span className="text-[13px] text-slate-900">{pct}% <span className="text-slate-400">· {Math.round(c.used / 1000)}k / {Math.round(c.limit / 1000)}k</span></span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className={pct >= 100 ? "h-full bg-rose-500" : pct >= 90 ? "h-full bg-amber-500" : "h-full bg-teal-500"} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <it.icon className="size-4 text-teal-600" />
            <div className="mt-2 text-[15px] text-slate-900">{it.value}</div>
            <div className="text-[11px] text-slate-400">{it.label}</div>
          </div>
        ))}
      </div>

      <button onClick={() => navigate("context")} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-[12px] text-slate-500 hover:border-teal-300 hover:text-teal-600">
        <Braces className="size-3.5" /> 查看完整概览 / 清空
      </button>
    </div>
  );
}

const statusMeta: Record<DiffFile["status"], { icon: typeof FileCode2; tone: string; label: string }> = {
  added: { icon: FilePlus2, tone: "text-emerald-600", label: "新增" },
  modified: { icon: FileEdit, tone: "text-teal-600", label: "修改" },
  deleted: { icon: FileX2, tone: "text-rose-500", label: "删除" },
  renamed: { icon: FileSymlink, tone: "text-indigo-500", label: "重命名" },
  untracked: { icon: FilePlus2, tone: "text-slate-400", label: "未跟踪" },
  binary: { icon: FileCode2, tone: "text-slate-400", label: "二进制" },
};

function ChangesPanel() {
  const { active, diffsOf, navigate } = useStore();
  const diffs = diffsOf(active.projectId);
  const totAdd = diffs.reduce((a, d) => a + d.added, 0);
  const totDel = diffs.reduce((a, d) => a + d.removed, 0);
  if (diffs.length === 0) return <div className="p-6 text-center text-[12.5px] text-slate-400">当前项目没有未提交的改动</div>;
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">改动 <span className="text-slate-900">{diffs.length}</span> 个文件</span>
        <span className="flex items-center gap-2 text-[11px]"><span className="text-emerald-600">+{totAdd}</span><span className="text-rose-500">-{totDel}</span></span>
      </div>
      <div className="space-y-1.5">
        {diffs.map((c) => {
          const m = statusMeta[c.status];
          return (
            <button key={c.path} onClick={() => navigate("changes", { path: c.path })} className="group flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-teal-200 hover:bg-teal-50/40">
              <m.icon className={`size-4 shrink-0 ${m.tone}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[12px] text-slate-700">{c.path.split("/").pop()}</div>
                <div className="text-[10.5px] text-slate-400">{m.label}</div>
              </div>
              {c.status === "binary" ? <span className="shrink-0 text-[11px] text-slate-400">二进制</span> : <span className={`shrink-0 font-mono text-[11px] ${m.tone}`}>+{c.added} -{c.removed}</span>}
              <ChevronRight className="size-3.5 shrink-0 text-slate-300 group-hover:text-slate-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ContextPanel() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("context");
  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-slate-200 bg-slate-50/60">
      <div className="flex items-center gap-1 border-b border-slate-200 px-2 py-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={["flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px]", tab === t.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"].join(" ")}>
            <t.icon className="size-3.5" />{t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{tab === "context" ? <ContextOverviewPanel /> : <ChangesPanel />}</div>
    </aside>
  );
}
