import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Trash2, AlertTriangle, ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { Section, Row, Select, Toggle, SaveBar, ConfirmDialog, Drawer } from "./kit";
import { permRules as seed, plugins, type PermRule } from "./data";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";
import { useRillSettingsOptional } from "../../settings/runtime";

const OPS: PermRule["op"][] = ["文件写入", "命令执行", "网络访问", "凭据读取", "文件读取"];
const highRiskOps = new Set(["文件写入", "命令执行", "网络访问", "凭据读取"]);
type Preview = "" | "allow" | "deny" | "ask";
type PermissionPageState = "normal" | "empty" | "conflict";

export function PermissionSettings() {
  const { navigate, params } = useStore();
  const live = useRillSettingsOptional();
  const persisted = live?.snapshot?.settings.permissions;
  const [mode, setMode] = useState("按风险询问");
  const [rules, setRules] = useState<PermRule[]>(seed);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PermRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [riskConfirm, setRiskConfirm] = useState<PermRule | null>(null);
  const [pstate, setPState] = useState<PermissionPageState>(() => initialVisualState(params.rillVisualState, ["normal", "empty", "conflict"] as const, "normal"));

  // 预览
  const [pvOp, setPvOp] = useState<PermRule["op"]>("文件写入");
  const [pvTarget, setPvTarget] = useState("~/work/rill/rill-web/src/index.ts");
  const [preview, setPreview] = useState<Preview>("");

  useEffect(() => {
    if (!persisted) return;
    setMode(persisted.mode === "deny" ? "仅允许明确规则" : persisted.mode === "allow" ? "按风险询问" : "始终询问");
    setRules([
      ...(persisted.allow ?? []).map((target, index): PermRule => ({ id: `allow-${index}`, name: target, effect: "allow", target, op: "命令执行", scope: "全局", origin: "用户", enabled: true })),
      ...(persisted.deny ?? []).map((target, index): PermRule => ({ id: `deny-${index}`, name: target, effect: "deny", target, op: "命令执行", scope: "全局", origin: "用户", enabled: true, highRisk: true })),
    ]);
    setDirty(false);
  }, [persisted]);

  const saveAll = async () => {
    if (!live || !persisted) return;
    const desiredAllow = rules.filter((rule) => rule.enabled && rule.effect === "allow").map((rule) => rule.target.trim()).filter(Boolean);
    const desiredDeny = rules.filter((rule) => rule.enabled && rule.effect === "deny").map((rule) => rule.target.trim()).filter(Boolean);
    const ok = await live.apply("保存权限设置", async () => {
      const b = live.backend;
      if (!b.SetPermissions) throw new Error("当前桌面后端缺少原子权限设置绑定");
      await b.SetPermissions(
        mode === "仅允许明确规则" ? "deny" : mode === "按风险询问" ? "allow" : "ask",
        desiredAllow,
        persisted.ask ?? [],
        desiredDeny,
      );
    });
    if (ok) { setDirty(false); toast.success("权限设置已保存并由后端重新读取"); }
    else toast.error("权限设置保存失败", { description: live.error || "后端未确认保存" });
  };

  const list = pstate === "empty" ? rules.filter((r) => r.origin !== "用户") : pstate === "conflict" ? rules : rules;

  const runPreview = () => {
    // deny 优先
    const deny = rules.find((r) => r.enabled && r.effect === "deny" && r.op === pvOp);
    const allow = rules.find((r) => r.enabled && r.effect === "allow" && r.op === pvOp);
    const result: Preview = deny ? "deny" : allow ? "allow" : mode === "始终询问" ? "ask" : mode === "仅允许明确规则" ? "deny" : highRiskOps.has(pvOp) ? "ask" : "allow";
    setPreview(result);
  };

  const save = (r: PermRule) => {
    if (!r.name.trim() || !r.target.trim()) return toast.error("名称与对象不能为空");
    const relaxing = r.effect === "allow" && highRiskOps.has(r.op);
    if (relaxing) { setRiskConfirm(r); return; }
    commit(r);
  };
  const commit = (r: PermRule) => {
    const withRisk = { ...r, highRisk: highRiskOps.has(r.op) };
    if (r.id === "new") setRules((rs) => [...rs, { ...withRisk, id: `pr${Date.now()}` }]);
    else setRules((rs) => rs.map((x) => x.id === r.id ? withRisk : x));
    setDirty(true); toast.success("规则已保存"); setEditing(null); setRiskConfirm(null);
  };

  return (
    <SettingsBody title="权限" desc="管理工具执行与本地资源修改的默认审批方式与允许/拒绝规则；权限审批不等同于沙箱隔离">
      {!live && <StateSwitcherLocal pstate={pstate} setPState={setPState} />}
      {live?.error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{live.error}</div>}

      <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-slate-100 p-3 text-[12px] text-slate-600"><ShieldCheck className="size-4 shrink-0" />权限规则决定“是否询问 / 允许 / 拒绝”某个操作，与沙箱的隔离能力相互独立。沙箱隔离请在“沙箱”页配置。</div>

      <Section title="默认审批模式" desc="决定未命中明确规则时的处理方式">
        <Row label="审批模式" hint={mode === "始终询问" ? "每个工具操作都会请求确认" : mode === "仅允许明确规则" ? "未被允许规则命中的操作一律拒绝" : "仅对高风险操作请求确认"}>
          <Select value={mode} onChange={(v) => { setMode(v); setDirty(true); }} options={["始终询问", "按风险询问", "仅允许明确规则"]} />
        </Row>
      </Section>

      <div className="mt-4">
        <Section title="规则列表" desc="明确拒绝规则优先于普通允许规则" actions={
          <button onClick={() => setEditing({ id: "new", name: "", effect: "allow", target: "", op: "文件写入", scope: "全局", origin: "用户", enabled: true })} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" />新增规则</button>
        }>
          {list.filter((r) => r.origin === "用户").length === 0 && pstate === "empty" ? (
            <div className="grid place-items-center py-8 text-center text-[13px] text-slate-400"><ShieldCheck className="size-7 text-slate-300" /><p className="mt-2">还没有自定义规则，仅系统与项目规则生效</p></div>
          ) : (
            <div className="space-y-2">
              {list.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${r.effect === "deny" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{r.effect === "deny" ? "拒绝" : "允许"}</span>
                    <span className="text-[13.5px] text-slate-900">{r.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-600">{r.op}</span>
                    {highRiskOps.has(r.op) && <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] bg-amber-50 text-amber-700"><AlertTriangle className="size-3" />高风险</span>}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{r.origin === "用户" ? "用户" : r.origin === "系统" ? "系统内置" : r.origin === "项目" ? "项目" : "插件"}</span>
                    {pstate === "conflict" && r.op === "文件写入" && <span className="rounded px-1.5 py-0.5 text-[10.5px] bg-amber-50 text-amber-700">存在冲突</span>}
                    <div className="ml-auto flex items-center gap-2">
                      <Toggle checked={r.enabled} onChange={(v) => { if (r.origin !== "用户") return toast.error("该规则由 " + r.origin + " 提供，不可修改"); setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, enabled: v } : x)); setDirty(true); }} />
                    </div>
                  </div>
                  <div className="mt-1.5 font-mono text-[11.5px] text-slate-500">{r.target}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 text-[11px] text-slate-400"><span>范围：{r.scope}</span><span>最近命中：{r.lastHit ?? "—"}</span></div>
                  <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                    {r.origin === "用户" ? (
                      <>
                        <button onClick={() => setEditing(r)} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">编辑</button>
                        <button onClick={() => setDeleteId(r.id)} className="ml-auto flex items-center gap-1 text-[11.5px] text-rose-600 hover:underline"><Trash2 className="size-3.5" />删除</button>
                      </>
                    ) : r.origin === "插件" ? (
                      <button onClick={() => navigate("settings", { tab: "plugin" })} className="flex items-center gap-1 text-[11.5px] text-violet-600 hover:underline"><ExternalLink className="size-3" />由插件 {plugins.find(p=>p.id===r.pluginId)?.name ?? "插件"} 提供</button>
                    ) : (
                      <span className="text-[11.5px] text-slate-400">由 {r.origin} 提供，不可直接修改</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="生效结果预览" desc="展示某次具体操作最终会被允许、拒绝还是需要确认（与运行时判断一致）">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block"><span className="text-[12px] text-slate-500">操作类型</span><Select value={pvOp} onChange={(v) => { setPvOp(v as PermRule["op"]); setPreview(""); }} options={OPS} /></label>
            <label className="block flex-1"><span className="text-[12px] text-slate-500">对象</span><input value={pvTarget} onChange={(e) => { setPvTarget(e.target.value); setPreview(""); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
            <button onClick={runPreview} className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-[12px] text-white hover:bg-teal-700"><Play className="size-3.5" />预览</button>
          </div>
          {preview && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] ${preview === "allow" ? "bg-emerald-50 text-emerald-700" : preview === "deny" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
              最终结果：{preview === "allow" ? "允许" : preview === "deny" ? "拒绝（明确拒绝规则优先）" : "需要确认"} · 审批模式「{mode}」
            </div>
          )}
        </Section>
      </div>

      <SaveBar dirty={dirty} saving={live?.saving ?? saving} onSave={() => {
        if (live) { void saveAll(); return; }
        setSaving(true); setTimeout(() => { setSaving(false); setDirty(false); toast.success("权限设置已保存", { description: "已保存不代表已在运行时生效，实际以运行时判断为准" }); }, 700);
      }} onReset={() => { if (live) void live.reload(); setDirty(false); toast("已放弃修改"); }} />

      {editing && <RuleEditor rule={editing} onClose={() => setEditing(null)} onSave={save} />}

      <ConfirmDialog open={!!riskConfirm} title="放宽高风险权限确认" tone="amber" confirmText="确认放宽" onConfirm={() => riskConfirm && commit(riskConfirm)} onCancel={() => setRiskConfirm(null)}>
        你正在新增/修改一条允许「{riskConfirm?.op}」的高风险规则。这会扩大{brand.productName}的操作边界，确认继续？
      </ConfirmDialog>

      <ConfirmDialog open={!!deleteId} title="删除规则" confirmText="删除" onConfirm={() => { setRules((rs) => rs.filter((x) => x.id !== deleteId)); setDeleteId(null); setDirty(true); toast.success("已删除规则"); }} onCancel={() => setDeleteId(null)}>
        删除后该规则将不再参与权限判断。确认删除？
      </ConfirmDialog>
    </SettingsBody>
  );
}

function StateSwitcherLocal({ pstate, setPState }: { pstate: PermissionPageState; setPState: (s: PermissionPageState) => void }) {
  const opts: { id: PermissionPageState; label: string }[] = [{ id: "normal", label: "正常列表" }, { id: "empty", label: "无自定义规则" }, { id: "conflict", label: "规则冲突" }];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] text-slate-400">演示状态：</span>
      {opts.map((o) => <button key={o.id} aria-pressed={pstate === o.id} onClick={() => setPState(o.id)} className={`rounded-full px-2.5 py-1 text-[11.5px] ${pstate === o.id ? "bg-teal-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{o.label}</button>)}
    </div>
  );
}

function RuleEditor({ rule, onClose, onSave }: { rule: PermRule; onClose: () => void; onSave: (r: PermRule) => void }) {
  const [r, setR] = useState<PermRule>(rule);
  const set = (patch: Partial<PermRule>) => setR((p) => ({ ...p, ...patch }));
  return (
    <Drawer title={rule.id === "new" ? "新增权限规则" : "编辑权限规则"} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
        <button onClick={() => onSave(r)} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">保存</button>
      </>
    }>
      <label className="block"><span className="text-[12px] text-slate-500">名称</span><input value={r.name} onChange={(e) => set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-[12px] text-slate-500">效果</span><Select value={r.effect === "deny" ? "拒绝" : "允许"} onChange={(v) => set({ effect: v === "拒绝" ? "deny" : "allow" })} options={["允许", "拒绝"]} /></label>
        <label className="block"><span className="text-[12px] text-slate-500">操作类型</span><Select value={r.op} onChange={(v) => set({ op: v as PermRule["op"] })} options={OPS} /></label>
      </div>
      <label className="block"><span className="text-[12px] text-slate-500">对象（命令 / 工具 / 路径 / 网络）</span><input value={r.target} onChange={(e) => set({ target: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="例如 git * 或 ~/work/**" /></label>
      <label className="block"><span className="text-[12px] text-slate-500">作用范围</span><Select value={r.scope} onChange={(v) => set({ scope: v })} options={["全局", "rill-web", "rillagent-cli"]} /><p className="mt-1 text-[11.5px] text-slate-400">项目规则只影响所选项目，不会影响其他项目。</p></label>
      {r.effect === "allow" && highRiskOps.has(r.op) && <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 p-2.5 text-[12px] text-amber-700"><AlertTriangle className="size-4" />这是放宽高风险权限，保存时需要确认。</div>}
    </Drawer>
  );
}
