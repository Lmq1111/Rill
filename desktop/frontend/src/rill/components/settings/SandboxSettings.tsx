import { useState } from "react";
import { Box, FolderPlus, Trash2, AlertTriangle, ShieldCheck, ShieldOff, RotateCcw, Play, FileText, FileEdit, Terminal, Globe } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { Section, Row, Select, Toggle, SaveBar, ConfirmDialog } from "./kit";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";

type Detect = "idle" | "detecting" | "protected" | "partial" | "off" | "unavailable" | "invalid" | "applying" | "applyFailed";

const MODES = ["只读", "仅工作区可写", "关闭沙箱"];

export function SandboxSettings() {
  const { params } = useStore();
  const [detect, setDetect] = useState<Detect>(() => initialVisualState(params.rillVisualState, ["protected", "partial", "off", "unavailable", "invalid", "applyFailed"] as const, "partial"));
  const [mode, setMode] = useState("仅工作区可写");
  const [network, setNetwork] = useState(false);
  const [dirs, setDirs] = useState(["~/work/rill/rill-web", "~/.rillagent/cache"]);
  const [newDir, setNewDir] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<null | "off" | "net" | "write" | "reset">(null);

  const runDetect = (result: Detect) => { setDetect("detecting"); toast("正在检测沙箱是否生效…"); setTimeout(() => { setDetect(result); }, 1200); };

  const summary: Record<string, { title: string; cls: string; icon: typeof ShieldCheck; text: string }> = {
    protected: { title: "保护已启用", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: ShieldCheck, text: "命令运行在隔离环境中，写入被限制在授权范围内。" },
    partial: { title: "部分保护", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: ShieldCheck, text: "文件写入受限，但网络访问未受限，隔离能力部分降级。" },
    off: { title: "保护未启用", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: ShieldOff, text: "沙箱已关闭，命令以当前用户完整权限执行。" },
    unavailable: { title: "后端不可用", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertTriangle, text: "当前系统缺少可用沙箱后端，已降级为无隔离执行。" },
    invalid: { title: "配置无效", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertTriangle, text: "存在无法解析的授权目录，配置未能应用。" },
    detecting: { title: "检测中", cls: "bg-sky-50 text-sky-700 border-sky-200", icon: ShieldCheck, text: "正在检测实际保护状态…" },
    applying: { title: "应用中", cls: "bg-sky-50 text-sky-700 border-sky-200", icon: ShieldCheck, text: "正在应用新的沙箱配置…" },
    applyFailed: { title: "应用失败", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertTriangle, text: "新配置未能生效，已回退到上一个可用配置。" },
    idle: { title: "未检测", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: Box, text: "尚未检测实际保护状态。" },
  };
  const s = summary[detect] ?? summary.idle;
  const SIcon = s.icon;

  const caps = [
    { icon: FileText, label: "文件读取", val: mode === "关闭沙箱" ? "不受限" : "允许读取工作区与授权目录" },
    { icon: FileEdit, label: "文件写入", val: mode === "只读" ? "全部禁止" : mode === "关闭沙箱" ? "不受限（风险）" : "仅工作区与授权目录" },
    { icon: Terminal, label: "命令执行", val: mode === "关闭沙箱" ? "完整用户权限" : "在隔离环境内执行" },
    { icon: Globe, label: "网络访问", val: mode === "关闭沙箱" ? "不受限" : network ? "允许（已放宽）" : "默认阻止" },
  ];

  return (
    <SettingsBody title="沙箱" desc={`配置${brand.productName}运行命令时实际可用的隔离能力、文件访问范围和网络范围；显示状态基于实际检测结果`}>
      <StateSwitcherLocal value={detect} onChange={setDetect} />

      <div className={`mb-4 flex items-start gap-2 rounded-xl border p-3.5 ${s.cls}`}>
        <SIcon className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0"><div className="text-[14px]">{s.title}</div><p className="mt-0.5 text-[12.5px] opacity-90">{s.text}</p></div>
        <button onClick={() => runDetect(mode === "关闭沙箱" ? "off" : network ? "partial" : "protected")} className="ml-auto shrink-0 rounded-lg bg-white/80 px-2.5 py-1 text-[11.5px] text-slate-700 ring-1 ring-black/5 hover:bg-white">重新检测</button>
      </div>

      <Section title="沙箱后端" desc="不同系统可用的隔离能力不同，不可用时会明确降级">
        <Row label="检测到的后端" hint="macOS Seatbelt / Linux bubblewrap / 无">
          <span className="text-[13px] text-slate-700">{detect === "unavailable" ? "无（不可用）" : "Seatbelt"}</span>
        </Row>
        <Row label="Bash 命令沙箱模式" hint="决定命令执行时的实际隔离方式">
          <Select value={mode} onChange={(v) => {
            if (v === "关闭沙箱") { setConfirm("off"); return; }
            if (v === "仅工作区可写" && mode === "只读") { setConfirm("write"); return; }
            setMode(v); setDirty(true);
          }} options={MODES} />
        </Row>
      </Section>

      <div className="mt-4">
        <Section title="能力边界（当前模式下的实际限制）">
          <div className="grid grid-cols-2 gap-3">
            {caps.map((c) => (
              <div key={c.label} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-1.5 text-[12px] text-slate-500"><c.icon className="size-3.5" />{c.label}</div>
                <div className="mt-1 text-[13px] text-slate-800">{c.val}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="授权目录" desc="工作区之外允许访问的本地目录，需使用可解析的本地路径">
          <Row label="网络访问" hint="沙箱内是否允许对外网络访问（放宽需确认）">
            <Toggle checked={network} onChange={(v) => { if (v) { setConfirm("net"); return; } setNetwork(false); setDirty(true); }} />
          </Row>
          <div className="mt-3 space-y-2">
            {dirs.map((d) => (
              <div key={d} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5">
                <span className="font-mono text-[12px] text-slate-700">{d}</span>
                <button onClick={() => { setDirs((ds) => ds.filter((x) => x !== d)); setDirty(true); }} className="ml-auto grid size-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="size-3.5" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newDir} onChange={(e) => setNewDir(e.target.value)} placeholder="~/path/to/dir" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" />
              <button onClick={() => {
                if (!newDir.startsWith("~") && !newDir.startsWith("/")) return toast.error("需使用可解析的本地路径");
                setDirs((ds) => [...ds, newDir]); setNewDir(""); setDirty(true); toast.success("已添加授权目录");
              }} className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-[12px] text-white hover:bg-teal-700"><FolderPlus className="size-4" />添加</button>
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => runDetect(mode === "关闭沙箱" ? "off" : network ? "partial" : "protected")} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"><Play className="size-4" />检测配置是否生效</button>
        <button onClick={() => setConfirm("reset")} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw className="size-4" />恢复安全默认值</button>
      </div>

      <SaveBar dirty={dirty} saving={saving} note="保存不代表已生效，请检测配置是否生效" onSave={() => { setSaving(true); setDetect("applying"); setTimeout(() => { setSaving(false); setDirty(false); setDetect(network ? "partial" : "protected"); toast.success("配置已应用，请查看检测结果"); }, 900); }} onReset={() => { setDirty(false); toast("已放弃修改"); }} />

      <ConfirmDialog open={confirm === "off"} title="关闭沙箱确认" confirmText="仍然关闭" onConfirm={() => { setMode("关闭沙箱"); setDirty(true); setConfirm(null); }} onCancel={() => setConfirm(null)}>
        关闭沙箱后，命令将以当前用户完整权限执行，不再受文件与网络隔离保护。确认关闭？
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "write"} title="放宽写入范围确认" tone="amber" confirmText="确认放宽" onConfirm={() => { setMode("仅工作区可写"); setDirty(true); setConfirm(null); }} onCancel={() => setConfirm(null)}>
        允许写入工作区会扩大命令的文件修改范围。确认放宽？
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "net"} title="开启网络访问确认" tone="amber" confirmText="确认开启" onConfirm={() => { setNetwork(true); setDirty(true); setConfirm(null); }} onCancel={() => setConfirm(null)}>
        允许沙箱内对外网络访问会降低隔离强度。确认开启？
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "reset"} title="恢复安全默认值" tone="amber" confirmText="恢复默认" onConfirm={() => { setMode("仅工作区可写"); setNetwork(false); setDirs(["~/work/rill/rill-web"]); setDirty(true); setConfirm(null); toast.success("已恢复安全默认值，请检测生效状态"); }} onCancel={() => setConfirm(null)}>
        将重置为：仅工作区可写、禁止网络访问、清除额外授权目录。确认恢复？
      </ConfirmDialog>
    </SettingsBody>
  );
}

function StateSwitcherLocal({ value, onChange }: { value: Detect; onChange: (v: Detect) => void }) {
  const opts: { id: Detect; label: string }[] = [
    { id: "protected", label: "保护已启用" }, { id: "partial", label: "部分保护" }, { id: "off", label: "保护未启用" },
    { id: "unavailable", label: "后端不可用" }, { id: "invalid", label: "配置无效" }, { id: "applyFailed", label: "应用失败" },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] text-slate-400">演示状态：</span>
      {opts.map((o) => <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={`rounded-full px-2.5 py-1 text-[11.5px] ${value === o.id ? "bg-teal-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{o.label}</button>)}
    </div>
  );
}
