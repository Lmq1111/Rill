import { useState } from "react";
import { Search, Users, Plus, Play, Square, Copy, ArrowRightToLine, ExternalLink, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { Section, StateSwitcher, ConfirmDialog, Drawer, Select } from "./kit";
import { subagents as seed, models, plugins, type Subagent } from "./data";
import { useStore } from "../../state/visualStore";

type Trial = "idle" | "running" | "ok" | "failed";

export function SubagentSettings() {
  const { navigate, params } = useStore();
  const [agents, setAgents] = useState<Subagent[]>(seed);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Subagent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [trial, setTrial] = useState<Trial>(() => initialVisualState(params.rillVisualState, ["idle", "running", "ok", "failed"] as const, "idle"));
  const [trialOf, setTrialOf] = useState<string | null>(null);

  const availableModels = ["继承默认", ...models.filter((m) => m.available).map((m) => m.name)];
  const list = agents.filter((a) => !query || a.name.includes(query) || a.desc.includes(query));

  const runTrial = (id: string, result: Trial) => {
    setTrialOf(id); setTrial("running");
    toast("试运行中（只读隔离任务）…");
    setTimeout(() => { setTrial(result); result === "ok" ? toast.success("试运行成功") : toast.error("试运行失败"); }, 1200);
  };

  return (
    <SettingsBody title="子智能体" desc="管理用于探索、研究、代码评审等专项任务的子智能体 Profile">
      <StateSwitcher value={trial} onChange={setTrial} options={[{ id: "idle", label: "正常" }, { id: "running", label: "试运行中" }, { id: "ok", label: "试运行成功" }, { id: "failed", label: "试运行失败" }]} />

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
        <Search className="size-4 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按名称或描述搜索" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
      </div>

      <Section title="子智能体 Profile" actions={
        <button onClick={() => setEditing({ id: "new", name: "", desc: "", origin: "自定义", model: "继承默认", reasoning: "继承默认", tools: "全部工具", color: "#10b981" })} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" />新建 Profile</button>
      }>
        {list.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Users className="size-7 text-slate-300" /><p className="mt-2">{agents.length === 0 ? "还没有自定义 Profile" : "没有匹配结果"}</p></div>
        ) : (
          <div className="space-y-2">
            {list.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: a.color }} />
                  <span className="text-[13.5px] text-slate-900">{a.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${a.origin === "内置" ? "bg-teal-50 text-teal-700" : a.origin === "插件" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500"}`}>{a.origin}</span>
                  {trialOf === a.id && trial !== "idle" && <span className={`rounded-full px-2 py-0.5 text-[11px] ${trial === "ok" ? "bg-emerald-50 text-emerald-700" : trial === "failed" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}>{trial === "running" ? "试运行中" : trial === "ok" ? "试运行成功" : "试运行失败"}</span>}
                </div>
                <p className="mt-1 text-[12px] text-slate-500">{a.desc}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-400"><span>模型：{a.model}</span><span>推理：{a.reasoning}</span><span>工具：{a.tools}</span></div>

                {a.origin === "插件" ? (
                  <div className="mt-2.5 border-t border-slate-100 pt-2.5">
                    <button onClick={() => navigate("settings", { tab: "plugin" })} className="flex items-center gap-1 text-[11.5px] text-violet-600 hover:underline"><ExternalLink className="size-3" />由插件 {plugins.find(p=>p.id===a.pluginId)?.name} 提供 · 前往插件管理</button>
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                    {trialOf === a.id && trial === "running" ? (
                      <button onClick={() => { setTrial("idle"); toast("已取消试运行"); }} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"><Square className="size-3.5" />取消</button>
                    ) : (
                      <button onClick={() => runTrial(a.id, a.id === "sa4" ? "ok" : "ok")} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Play className="size-3.5" />试运行</button>
                    )}
                    <button onClick={() => setEditing(a)} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">编辑</button>
                    <button onClick={() => { navigator.clipboard?.writeText?.(`@${a.name}`); toast.success("已复制调用命令"); }} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Copy className="size-3.5" />复制命令</button>
                    <button onClick={() => { navigate("workbench"); toast.success("已把调用命令带入主工作台输入框", { description: `@${a.name}` }); }} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"><ArrowRightToLine className="size-3.5" />带入主工作台</button>
                    {a.origin === "自定义" && <button onClick={() => setDeleteId(a.id)} className="ml-auto text-[11.5px] text-rose-600 hover:underline">删除</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {editing && <AgentEditor agent={editing} models={availableModels} onClose={() => setEditing(null)} onSave={(a) => {
        if (!/^[a-zA-Z0-9-]+$/.test(a.name)) return toast.error("名称格式无效", { description: "仅允许字母、数字和连字符" });
        if (agents.some((x) => x.id !== a.id && x.name === a.name)) return toast.error("名称与其他子智能体冲突");
        if (a.id === "new") setAgents((as) => [...as, { ...a, id: `sa${Date.now()}` }]); else setAgents((as) => as.map((x) => x.id === a.id ? a : x));
        toast.success("已保存"); setEditing(null);
      }} />}

      <ConfirmDialog open={!!deleteId} title="删除子智能体" confirmText="删除" onConfirm={() => { setAgents((as) => as.filter((x) => x.id !== deleteId)); setDeleteId(null); toast.success("已删除"); }} onCancel={() => setDeleteId(null)}>
        删除自定义 Profile 后将无法再调用它。确认删除？
      </ConfirmDialog>
    </SettingsBody>
  );
}

function AgentEditor({ agent, models, onClose, onSave }: { agent: Subagent; models: string[]; onClose: () => void; onSave: (a: Subagent) => void }) {
  const [a, setA] = useState<Subagent>(agent);
  const set = (patch: Partial<Subagent>) => setA((p) => ({ ...p, ...patch }));
  const builtin = a.origin === "内置";
  const colors = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

  return (
    <Drawer title={agent.id === "new" ? "新建子智能体" : builtin ? "覆盖内置 Profile" : "编辑子智能体"} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
        {builtin && <button onClick={() => { set({ model: "继承默认", reasoning: "继承默认" }); toast("已恢复继承默认值"); }} className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw className="size-3.5" />恢复默认</button>}
        <button onClick={() => onSave(a)} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">保存</button>
      </>
    }>
      {builtin && <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2.5 text-[12px] text-slate-500"><AlertTriangle className="size-3.5" />内置 Profile 的固定说明与工具边界不可修改，仅可覆盖模型与推理强度。</div>}
      <label className="block"><span className="text-[12px] text-slate-500">名称</span><input value={a.name} disabled={builtin} onChange={(e) => set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300 disabled:bg-slate-50" placeholder="仅字母、数字、连字符" /></label>
      {!builtin && <div><span className="text-[12px] text-slate-500">颜色标记</span><div className="mt-1 flex gap-2">{colors.map((c) => <button key={c} onClick={() => set({ color: c })} className={`size-7 rounded-full ${a.color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""}`} style={{ background: c }} />)}</div></div>}
      <label className="block"><span className="text-[12px] text-slate-500">描述</span><input value={a.desc} disabled={builtin} onChange={(e) => set({ desc: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300 disabled:bg-slate-50" /></label>
      {!builtin && <label className="block"><span className="text-[12px] text-slate-500">系统提示词</span><textarea rows={3} className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" placeholder="定义该子智能体的行为与边界" /></label>}
      <label className="block"><span className="text-[12px] text-slate-500">模型</span><Select value={a.model} onChange={(v) => set({ model: v })} options={models} /></label>
      <label className="block"><span className="text-[12px] text-slate-500">推理强度</span><Select value={a.reasoning} onChange={(v) => set({ reasoning: v })} options={["继承默认", "低", "中", "高"]} /></label>
      {!builtin && (
        <label className="block"><span className="text-[12px] text-slate-500">工具范围</span>
          <Select value={a.tools} onChange={(v) => set({ tools: v })} options={["全部工具", "指定工具范围"]} />
          <p className="mt-1 text-[11.5px] text-slate-400">工具范围只能缩小当前会话可用工具，不能绕过权限与沙箱。</p>
        </label>
      )}
    </Drawer>
  );
}
