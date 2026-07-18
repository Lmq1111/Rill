import { useMemo, useState } from "react";
import {
  FileDiff, GitBranch, RefreshCw, FilePlus2, FileX2, FileSymlink,
  FileQuestion, FileEdit, AtSign, ScanText, GitCompare, Binary, AlertTriangle, Info,
} from "lucide-react";
import { toast } from "sonner";
import { brand } from "../../../lib/brand";
import { PageShell } from "./PageShell";
import { useStore, type DiffFile, type DiffStatus } from "../../state/visualStore";

const kindMeta: Record<DiffStatus, { icon: typeof FilePlus2; label: string; tone: string; badge: string }> = {
  added: { icon: FilePlus2, label: "新增", tone: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  modified: { icon: FileEdit, label: "修改", tone: "text-teal-600", badge: "bg-teal-50 text-teal-700 ring-teal-200" },
  deleted: { icon: FileX2, label: "删除", tone: "text-rose-600", badge: "bg-rose-50 text-rose-700 ring-rose-200" },
  renamed: { icon: FileSymlink, label: "重命名", tone: "text-violet-600", badge: "bg-violet-50 text-violet-700 ring-violet-200" },
  untracked: { icon: FileQuestion, label: "未跟踪", tone: "text-amber-600", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  binary: { icon: Binary, label: "二进制", tone: "text-slate-500", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function Changes() {
  const { active: session, projects, diffsOf, params, addRefToActive } = useStore();
  const project = projects.find((p) => p.id === session.projectId) ?? projects[0];
  const diffs = diffsOf(project.id);
  const [loading, setLoading] = useState(false);
  const initial = useMemo(() => diffs.find((d) => d.path === params.path) ?? diffs[0] ?? null, [diffs, params.path]);
  const [active, setActive] = useState<DiffFile | null>(initial);
  const [sel, setSel] = useState<{ from: number; to: number } | null>(null);

  const cur = active && diffs.find((d) => d.path === active.path) ? active : diffs[0] ?? null;
  const totAdd = diffs.reduce((a, d) => a + d.added, 0);
  const totDel = diffs.reduce((a, d) => a + d.removed, 0);
  const noRepo = project.status === "unavailable";
  const flat = cur?.hunks?.flatMap((h) => h.lines) ?? [];

  const refresh = () => { setLoading(true); toast("刷新改动状态…"); setTimeout(() => setLoading(false), 700); };

  return (
    <PageShell icon={FileDiff} title="改动" subtitle={`${project.name} · 查看 Git 工作区改动与差异（仅查看与引用）`}
      actions={<button onClick={refresh} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> 刷新</button>}>
      {noRepo ? (
        <div className="grid h-full place-items-center text-center text-slate-400"><div><GitBranch className="mx-auto size-8 text-slate-300" /><p className="mt-2 text-[13px]">当前工作区不是 Git 仓库</p></div></div>
      ) : diffs.length === 0 ? (
        <div className="grid h-full place-items-center text-center text-slate-400"><div><GitCompare className="mx-auto size-8 text-slate-300" /><p className="mt-2 text-[13px]">工作区干净，没有改动</p></div></div>
      ) : (
        <div className="flex h-full">
          <div className="flex w-[380px] shrink-0 flex-col border-r border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-[12px]">
              <GitBranch className="size-4 text-emerald-500" />
              <span className="font-mono text-slate-700">{project.branch}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{diffs.length} 个文件改动</span>
              <span className="ml-auto font-mono text-[11px]"><span className="text-emerald-600">+{totAdd}</span> <span className="text-rose-500">-{totDel}</span></span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {diffs.map((c) => {
                const m = kindMeta[c.status];
                const Icon = m.icon;
                return (
                  <button key={c.path} onClick={() => { setActive(c); setSel(null); }} className={["mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left", cur?.path === c.path ? "bg-teal-50 ring-1 ring-teal-200" : "hover:bg-slate-50"].join(" ")}>
                    <Icon className={`size-4 shrink-0 ${m.tone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-[12px] text-slate-700">{c.path.split("/").pop()}</div>
                      <div className="truncate text-[10.5px] text-slate-400">{c.status === "renamed" && c.oldPath ? `${c.oldPath} → ${c.path}` : c.path}</div>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ring-1 ${m.badge}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
            {cur ? (
              <>
                <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
                  <span className="truncate font-mono text-[12.5px] text-slate-700">{cur.status === "renamed" && cur.oldPath ? `${cur.oldPath} → ${cur.path}` : cur.path}</span>
                  {cur.status !== "binary" && <span className="font-mono text-[11px]"><span className="text-emerald-600">+{cur.added}</span> <span className="text-rose-500">-{cur.removed}</span></span>}
                  <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ring-1 ${kindMeta[cur.status].badge}`}>{kindMeta[cur.status].label}</span>
                </div>

                {cur.aiNote && (
                  <div className="flex items-center gap-1.5 border-b border-slate-200 bg-sky-50 px-4 py-1.5 text-[11px] text-sky-700">
                    <Info className="size-3.5" /> {brand.productName}解释：{cur.aiNote}（此为解释，非 Git 原始状态）
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-auto">
                  {cur.status === "binary" ? (
                    <div className="grid h-full place-items-center text-center text-slate-400"><div><Binary className="mx-auto size-7" /><p className="mt-2 text-[13px]">二进制文件变更，无法显示文本 Diff</p></div></div>
                  ) : cur.status === "deleted" ? (
                    <div className="grid h-full place-items-center text-center text-slate-400"><div><FileX2 className="mx-auto size-7 text-rose-400" /><p className="mt-2 text-[13px]">文件已删除（不显示完整预览，仅显示删除的行）</p>
                      <div className="mx-auto mt-3 max-w-md text-left font-mono text-[11.5px]">{flat.map((l, i) => <div key={i} className="bg-rose-50 text-rose-700">- {l.t.replace(/^[-+]/, "")}</div>)}</div>
                    </div></div>
                  ) : (
                    <div className="font-mono text-[12px] leading-relaxed">
                      {flat.map((l, i) => {
                        const n = i + 1;
                        const inSel = sel && n >= sel.from && n <= sel.to;
                        return (
                          <div key={i} onClick={() => setSel((p) => !p ? { from: n, to: n } : n < p.from ? { from: n, to: p.to } : { from: p.from, to: n })} className={["flex cursor-pointer", inSel ? "ring-1 ring-inset ring-teal-300" : "", l.kind === "add" ? "bg-emerald-50" : l.kind === "del" ? "bg-rose-50" : ""].join(" ")}>
                            <span className="w-8 shrink-0 select-none px-1 text-right text-slate-300">{n}</span>
                            <span className={["w-5 shrink-0 select-none text-center", l.kind === "add" ? "text-emerald-600" : l.kind === "del" ? "text-rose-500" : "text-slate-300"].join(" ")}>{l.kind === "add" ? "+" : l.kind === "del" ? "-" : ""}</span>
                            <span className={l.kind === "add" ? "text-emerald-800" : l.kind === "del" ? "text-rose-700" : "text-slate-600"}>{l.t.replace(/^[-+] /, "")}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {cur.status !== "binary" && cur.status !== "deleted" && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white p-3">
                    <button onClick={() => addRefToActive({ id: `df${Date.now()}`, kind: "diff", label: `diff:${cur.path.split("/").pop()}`, detail: "整个文件差异" })} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[12px] text-white hover:bg-teal-700"><FilePlus2 className="size-3.5" />差异加入对话</button>
                    <button disabled={!sel} onClick={() => addRefToActive({ id: `ds${Date.now()}`, kind: "diffSnippet", label: `diff:${cur.path.split("/").pop()}:${sel!.from}-${sel!.to}`, detail: "选中差异片段" })} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><ScanText className="size-3.5" />选中片段加入</button>
                    <button onClick={() => addRefToActive({ id: `dp${Date.now()}`, kind: "path", label: `path:${cur.path}`, detail: "路径引用" })} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><AtSign className="size-3.5" />路径引用</button>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400"><AlertTriangle className="size-3.5" />仅提供查看与引用，不提供提交 / 推送 / 丢弃 / 重置</span>
                  </div>
                )}
              </>
            ) : <div className="grid h-full place-items-center text-[13px] text-slate-400">选择左侧文件查看 Diff</div>}
          </div>
        </div>
      )}
    </PageShell>
  );
}
