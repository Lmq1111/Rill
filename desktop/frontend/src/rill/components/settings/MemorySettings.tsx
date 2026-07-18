import { useState } from "react";
import { Brain, Plus, Search, Trash2, Globe, FolderGit2, ShieldAlert, Pencil } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { Section, StateSwitcher, ConfirmDialog, Drawer, Select } from "./kit";
import { projects, useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";

type Scope = "全局" | string; // 全局 或 项目名
interface Memory { id: string; text: string; scope: Scope; type: "用户" | "项目" | "偏好"; }

const seed: Memory[] = [
  { id: "mm1", text: "回复保持简洁，代码优先给可运行示例。", scope: "全局", type: "偏好" },
  { id: "mm2", text: "rill-web 使用 pnpm，组件放在 src/app/components。", scope: "rill-web", type: "项目" },
  { id: "mm3", text: "提交信息使用中文，遵循 Conventional Commits。", scope: "全局", type: "用户" },
  { id: "mm4", text: "rillagent-cli 的发布流程需先跑 /devkit-release。", scope: "rillagent-cli", type: "项目" },
];

// 简单的凭据/密钥检测，命中则拒绝保存为普通记忆
const looksLikeSecret = (t: string) =>
  /(sk-[a-z0-9]{8,}|api[_-]?key|token|secret|bearer\s|xox[baprs]-|ghp_[a-z0-9]{20,}|-----begin)/i.test(t);

export function MemorySettings() {
  const { params } = useStore();
  const [items, setItems] = useState<Memory[]>(seed);
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("全部");
  const [editing, setEditing] = useState<Memory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pstate, setPState] = useState(() => initialVisualState(params.rillVisualState, ["normal", "empty"] as const, "normal"));

  const scopeOptions = ["全部", "全局", ...projects.map((p) => p.name)];
  const list = (pstate === "empty" ? [] : items).filter((m) =>
    (scopeFilter === "全部" || m.scope === scopeFilter) &&
    (!query || m.text.includes(query))
  );

  const save = (m: Memory, currentProject: string) => {
    if (!m.text.trim()) return toast.error("记忆内容不能为空");
    if (looksLikeSecret(m.text)) return toast.error("检测到疑似凭据", { description: "API Key、Token 等凭据不能保存为普通记忆" });
    if (m.type === "项目" && m.scope !== currentProject && !projects.some((p) => p.name === m.scope)) return toast.error("无效的项目范围");
    if (m.id === "new") setItems((is) => [...is, { ...m, id: `mm${Date.now()}` }]);
    else setItems((is) => is.map((x) => x.id === m.id ? m : x));
    toast.success("记忆已保存"); setEditing(null);
  };

  return (
    <SettingsBody title="记忆" desc={`管理${brand.productName}记住的用户偏好与项目事实；凭据不会被保存，项目记忆彼此隔离`}>
      <StateSwitcher value={pstate} onChange={setPState} options={[{ id: "normal", label: "正常" }, { id: "empty", label: "无记忆" }]} />

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-800"><ShieldAlert className="size-4 shrink-0" />API Key、Token 等明显凭据不会被写入记忆；项目记忆只作用于对应项目，不会写入其他项目。</div>

      <div className="mb-4 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
          <Search className="size-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索记忆内容" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
        </div>
        <div className="w-40"><Select value={scopeFilter} onChange={setScopeFilter} options={scopeOptions} /></div>
      </div>

      <Section title="记忆列表" actions={
        <button onClick={() => setEditing({ id: "new", text: "", scope: "全局", type: "偏好" })} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" />新增记忆</button>
      }>
        {list.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Brain className="size-7 text-slate-300" /><p className="mt-2">{items.length === 0 || pstate === "empty" ? "还没有任何记忆" : "没有匹配的记忆"}</p></div>
        ) : (
          <div className="space-y-2">
            {list.map((m) => (
              <div key={m.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <span className={`mt-0.5 flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] ${m.scope === "全局" ? "bg-sky-50 text-sky-700" : "bg-teal-50 text-teal-700"}`}>
                  {m.scope === "全局" ? <Globe className="size-3" /> : <FolderGit2 className="size-3" />}{m.scope}
                </span>
                <p className="min-w-0 flex-1 text-[13px] text-slate-700">{m.text}</p>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{m.type}</span>
                <button onClick={() => setEditing(m)} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="size-3.5" /></button>
                <button onClick={() => setDeleteId(m.id)} className="grid size-7 shrink-0 place-items-center rounded-lg text-rose-500 ring-1 ring-slate-200 hover:bg-rose-50"><Trash2 className="size-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {editing && <MemoryEditor memory={editing} onClose={() => setEditing(null)} onSave={save} />}

      <ConfirmDialog open={!!deleteId} title="删除记忆" confirmText="删除" onConfirm={() => { setItems((is) => is.filter((x) => x.id !== deleteId)); setDeleteId(null); toast.success("已删除该记忆"); }} onCancel={() => setDeleteId(null)}>
        删除后{brand.productName}将不再参考这条记忆。确认删除？
      </ConfirmDialog>
    </SettingsBody>
  );
}

function MemoryEditor({ memory, onClose, onSave }: { memory: Memory; onClose: () => void; onSave: (m: Memory, currentProject: string) => void }) {
  const [m, setM] = useState<Memory>(memory);
  const set = (patch: Partial<Memory>) => setM((p) => ({ ...p, ...patch }));
  const isProject = m.type === "项目";
  const warn = looksLikeSecret(m.text);

  return (
    <Drawer title={memory.id === "new" ? "新增记忆" : "编辑记忆"} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
        <button onClick={() => onSave(m, projects[0].name)} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">保存</button>
      </>
    }>
      <label className="block"><span className="text-[12px] text-slate-500">记忆内容</span>
        <textarea rows={4} value={m.text} onChange={(e) => set({ text: e.target.value })} className={`mt-1 w-full resize-none rounded-lg border px-3 py-2 text-[13px] outline-none ${warn ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-teal-300"}`} placeholder="例如：优先使用中文回复" />
      </label>
      {warn && <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2.5 text-[12px] text-rose-700"><ShieldAlert className="size-4" />检测到疑似凭据，凭据不能保存为记忆。</div>}
      <label className="block"><span className="text-[12px] text-slate-500">类型</span><Select value={m.type} onChange={(v) => set({ type: v as Memory["type"], scope: v === "项目" ? (projects.some((p) => p.name === m.scope) ? m.scope : projects[0].name) : "全局" })} options={["偏好", "用户", "项目"]} /></label>
      {isProject ? (
        <label className="block"><span className="text-[12px] text-slate-500">所属项目</span><Select value={m.scope} onChange={(v) => set({ scope: v })} options={projects.map((p) => p.name)} /><p className="mt-1 text-[11.5px] text-slate-400">项目记忆只作用于所选项目，不会写入其他项目。</p></label>
      ) : (
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2.5 text-[12px] text-slate-500"><Globe className="size-4" />该记忆将作为全局记忆，对所有项目生效。</div>
      )}
    </Drawer>
  );
}
