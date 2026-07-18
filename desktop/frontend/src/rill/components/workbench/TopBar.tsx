import { useState } from "react";
import {
  FolderGit2, GitBranch, Terminal, Bot, Clock3, ChevronRight, Copy, Download,
  Gauge, FileCode2, FileDiff, Boxes, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { brand } from "../../../lib/brand";
import { useStore, runMeta } from "../../state/visualStore";

function Segment({ icon: Icon, label, value, tone = "text-slate-600" }: { icon: typeof FolderGit2; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`size-3.5 ${tone}`} />
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-[12px] text-slate-700">{value}</span>
    </div>
  );
}

export function TopBar() {
  const { active, projects, navigate } = useStore();
  const s = active;
  const project = projects.find((p) => p.id === s.projectId) ?? projects[0];
  const meta = runMeta[s.runState];
  const [exportOpen, setExportOpen] = useState(false);

  const sourceValue = s.source === "local" ? `本地 CLI · ${brand.cliBrand}` : s.sourceDetail ?? (s.source === "bot" ? "机器人" : "自动化任务");
  const SourceIcon = s.source === "local" ? Terminal : s.source === "bot" ? Bot : Clock3;
  const sourceTone = s.source === "local" ? "text-slate-500" : s.source === "bot" ? "text-violet-500" : "text-amber-500";

  return (
    <header className="flex flex-col gap-2 border-b border-slate-200 bg-white/80 px-5 pt-3 pb-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Boxes className="size-4 text-teal-600" />
          <span className="text-[13px] text-slate-500">{project.name}</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="truncate text-[14px] text-slate-900">{s.title}</span>
          <span className={`ml-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${meta.cls}`}>
            {meta.dot && <span className={`size-1.5 rounded-full ${meta.dot} animate-pulse`} />}
            {s.runState === "readonly" && <Lock className="size-3" />}
            {meta.label}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => navigate("context")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-slate-100"><Gauge className="size-4" /> 上下文</button>
          <button onClick={() => navigate("files")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-slate-100"><FileCode2 className="size-4" /> 文件</button>
          <button onClick={() => navigate("changes")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-slate-100"><FileDiff className="size-4" /> 改动</button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <button onClick={() => toast.success("已复制完整会话到剪贴板")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-slate-100"><Copy className="size-4" /> 复制</button>
          <div className="relative">
            <button onClick={() => setExportOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-slate-100"><Download className="size-4" /> 导出</button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {["Markdown", "JSON", "PDF", "图片"].map((f) => (
                    <button key={f} onClick={() => { setExportOpen(false); toast.success(`已导出为 ${f}`, { description: `${s.title}` }); }} className="block w-full px-3 py-1.5 text-left text-[12.5px] text-slate-600 hover:bg-slate-50">导出为 {f}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <Segment icon={FolderGit2} label="工作目录" value={project.path} />
        <Segment icon={GitBranch} label="分支" value={project.branch} tone="text-emerald-500" />
        <Segment icon={SourceIcon} label="来源" value={sourceValue} tone={sourceTone} />
        {s.source === "bot" && s.channelId && (
          <button onClick={() => navigate("channel", { id: s.channelId! })} className="flex items-center gap-1.5">
            <Bot className="size-3.5 text-violet-500" />
            <span className="text-[11px] text-slate-400">渠道</span>
            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-600 ring-1 ring-violet-200 hover:bg-violet-100">查看详情</span>
          </button>
        )}
        {s.source === "schedule" && s.scheduleTaskId && (
          <button onClick={() => navigate("automation")} className="flex items-center gap-1.5">
            <Clock3 className="size-3.5 text-amber-500" />
            <span className="text-[11px] text-slate-400">任务</span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-600 ring-1 ring-amber-200 hover:bg-amber-100">查看任务</span>
          </button>
        )}
      </div>
    </header>
  );
}
