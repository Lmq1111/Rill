import { useEffect, useMemo, useState } from "react";
import {
  FileCode2, Folder, FolderOpen, Search, RefreshCw, X, AtSign, FilePlus2,
  ScanText, AlertTriangle, Binary, FileWarning, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "./PageShell";
import { useStore, type FileNode } from "../../state/visualStore";

interface TreeDir { name: string; path: string; type: "dir"; children: TreeItem[] }
type TreeFile = Omit<FileNode, "type"> & { type: "file"; displayName: string };
type TreeItem = TreeDir | TreeFile;

function buildTree(files: FileNode[]): TreeItem[] {
  const root: TreeItem[] = [];
  for (const f of files) {
    const parts = f.path.split("/");
    let level = root;
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      acc = acc ? `${acc}/${parts[i]}` : parts[i];
      const isLeaf = i === parts.length - 1;
      if (isLeaf) {
        level.push({ ...f, type: "file", displayName: parts[i] });
      } else {
        let dir = level.find((n) => n.type === "dir" && n.name === parts[i]) as TreeDir | undefined;
        if (!dir) { dir = { name: parts[i], path: acc, type: "dir", children: [] }; level.push(dir); }
        level = dir.children;
      }
    }
  }
  return root;
}

function TreeNode({ node, depth, onOpen, activePath }: { node: TreeItem; depth: number; onOpen: (n: FileNode) => void; activePath: string | null }) {
  const [open, setOpen] = useState(depth < 2);
  if (node.type === "dir") {
    return (
      <div>
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[12.5px] text-slate-600 hover:bg-slate-100" style={{ paddingLeft: depth * 12 + 8 }}>
          {open ? <FolderOpen className="size-3.5 text-amber-500" /> : <Folder className="size-3.5 text-amber-500" />}{node.name}
        </button>
        {open && node.children.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} onOpen={onOpen} activePath={activePath} />)}
      </div>
    );
  }
  return (
    <button onClick={() => onOpen(node)} className={["flex w-full items-center gap-1.5 rounded px-2 py-1 text-[12.5px]", activePath === node.path ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200" : "text-slate-600 hover:bg-slate-100"].join(" ")} style={{ paddingLeft: depth * 12 + 8 }}>
      <FileCode2 className="size-3.5 text-slate-400" />{node.displayName}
    </button>
  );
}

function StatusBox({ icon: Icon, text, tone = "slate" }: { icon: typeof Binary; text: string; tone?: "slate" | "amber" | "rose" }) {
  const cls = tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-700" : tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500";
  return <div className={`grid place-items-center rounded-lg border p-10 text-center ${cls}`}><Icon className="size-7" /><p className="mt-2 text-[13px]">{text}</p></div>;
}

export function Files() {
  const { active: session, projects, filesOf, addRefToActive, refreshFiles, readFile } = useStore();
  const project = projects.find((p) => p.id === session.projectId) ?? projects[0];
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<FileNode | null>(null);
  const [sel, setSel] = useState<{ from: number; to: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const files = filesOf(project.id);
  const shown = query ? files.filter((f) => f.path.toLowerCase().includes(query.toLowerCase())) : files;
  const tree = useMemo(() => buildTree(shown), [shown]);
  const lines = file?.content?.split("\n") ?? [];

  useEffect(() => {
    void refreshFiles(project.id);
  }, [project.id]);

  const refresh = async () => {
    setRefreshing(true);
    await refreshFiles(project.id);
    setRefreshing(false);
    toast.success("已刷新文件树");
  };
  const open = async (n: FileNode) => {
    setFile(n);
    setSel(null);
    const loaded = await readFile(project.id, n.path);
    if (loaded) setFile(loaded);
  };
  const toggleLine = (i: number) => {
    setSel((prev) => {
      if (!prev) return { from: i, to: i };
      if (i < prev.from) return { from: i, to: prev.to };
      return { from: prev.from, to: i };
    });
  };

  return (
    <PageShell icon={FileCode2} title="文件" subtitle={`${project.name} · ${project.path}`}
      actions={<button onClick={() => void refresh()} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> 刷新</button>}>
      <div className="flex h-full">
        <div className="flex w-[300px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
              <Search className="size-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索文件名或路径" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
              {query && <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600"><X className="size-3.5" /></button>}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><ShieldCheck className="size-3.5 text-emerald-500" />仅可浏览工作区及授权目录</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {tree.length === 0 ? <div className="p-4 text-center text-[12px] text-slate-400">未找到匹配的文件</div> : tree.map((n) => <TreeNode key={n.path} node={n} depth={0} onOpen={open} activePath={file?.path ?? null} />)}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
          {!file ? (
            <div className="grid h-full place-items-center text-center text-[13px] text-slate-400"><div><FileCode2 className="mx-auto size-8 text-slate-300" /><p className="mt-2">选择左侧文件以预览</p></div></div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
                <FileCode2 className="size-4 text-teal-600" />
                <span className="truncate font-mono text-[12.5px] text-slate-700">{file.path}</span>
                {file.large && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] text-amber-600">大文件</span>}
                <button onClick={() => setFile(null)} className="ml-auto grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="关闭"><X className="size-4" /></button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-4">
                {file.kind === "empty" ? <div className="grid h-full place-items-center text-[13px] text-slate-400">文件为空</div>
                  : file.kind === "binary" ? <StatusBox icon={Binary} text="二进制文件，无法以文本预览" />
                  : file.large ? <StatusBox icon={FileWarning} text="文件过大，不会全部注入上下文，仅支持路径引用" tone="amber" />
                  : file.kind === "unreadable" ? <StatusBox icon={AlertTriangle} text="文件不可读，已停止预览（不生成虚假内容）" tone="rose" />
                  : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white font-mono text-[12px] leading-relaxed">
                      {lines.map((ln, i) => {
                        const n = i + 1;
                        const inSel = sel && n >= sel.from && n <= sel.to;
                        return (
                          <div key={i} onClick={() => toggleLine(n)} className={`flex cursor-pointer ${inSel ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                            <span className="w-10 shrink-0 select-none px-2 text-right text-slate-300">{n}</span>
                            <span className="whitespace-pre px-2 text-slate-700">{ln || " "}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                {file.kind === "text" && !file.large && <div className="mt-2 text-[11px] text-slate-400">点击行号选择片段（当前：{sel ? `第 ${sel.from}–${sel.to} 行` : "未选择"}）</div>}
              </div>

              {file.kind === "text" && !file.large && (
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white p-3">
                  <span className="text-[11.5px] text-slate-400">加入对话时请明确加入内容：</span>
                  <button disabled={!sel} onClick={() => { const content = lines.slice(sel!.from - 1, sel!.to).join("\n"); addRefToActive({ id: `sn${Date.now()}`, kind: "snippet", label: `${file.path}:${sel!.from}-${sel!.to}`, detail: `路径：${file.path}\n行号：${sel!.from}-${sel!.to}\n\n${content}` }); }} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[12px] text-white hover:bg-teal-700 disabled:opacity-40"><ScanText className="size-3.5" />加入选中片段</button>
                  <button onClick={() => addRefToActive({ id: `fl${Date.now()}`, kind: "file", label: file.path, detail: `路径：${file.path}\n\n${file.content ?? ""}` })} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><FilePlus2 className="size-3.5" />加入完整文件</button>
                  <button onClick={() => addRefToActive({ id: `pt${Date.now()}`, kind: "path", label: `path:${file.path}`, detail: `路径：${file.path}` })} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><AtSign className="size-3.5" />加入路径引用</button>
                </div>
              )}
              {(file.large || file.kind === "binary") && (
                <div className="border-t border-slate-200 bg-white p-3">
                  <button onClick={() => addRefToActive({ id: `pt${Date.now()}`, kind: "path", label: `path:${file.path}`, detail: `路径：${file.path}` })} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><AtSign className="size-3.5" />仅加入路径引用</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
