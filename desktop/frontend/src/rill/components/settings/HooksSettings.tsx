import { useEffect, useState } from "react";
import { Webhook, Plus, Play, Copy, Trash2, ExternalLink, AlertTriangle, Terminal } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { Section, Toggle, StateSwitcher, ConfirmDialog, Drawer, Select } from "./kit";
import { hooks as seed, plugins, type Hook } from "./data";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";
import { useRillSettingsOptional } from "../../settings/runtime";
import type { HookConfigView } from "../../../lib/types";

const EVENTS = ["会话开始", "会话结束", "模型调用前", "模型调用后", "工具调用前", "工具调用后", "任务完成"];
const resultMeta: Record<Hook["lastResult"], { label: string; cls: string }> = {
  ok: { label: "成功", cls: "bg-emerald-50 text-emerald-700" },
  failed: { label: "失败", cls: "bg-rose-50 text-rose-700" },
  timeout: { label: "超时", cls: "bg-amber-50 text-amber-700" },
  never: { label: "未执行", cls: "bg-slate-100 text-slate-500" },
};
// 简易高风险命令识别
const isRisky = (cmd: string) => /(rm\s+-rf|sudo|curl|wget|chmod\s+777|mkfs|dd\s+if=|:\(\)\{)/i.test(cmd);

type Test = "idle" | "running" | "ok" | "failed" | "timeout" | "unavailable";

export function HooksSettings() {
  const { navigate, params } = useStore();
  const live = useRillSettingsOptional();
  const [items, setItems] = useState<Hook[]>(seed);
  const [editing, setEditing] = useState<Hook | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [riskConfirm, setRiskConfirm] = useState<Hook | null>(null);
  const [pstate, setPState] = useState(() => initialVisualState(params.rillVisualState, ["normal", "empty"] as const, "normal"));

  useEffect(() => {
    if (!live?.snapshot) return;
    setItems(live.snapshot.hooks.hooks.map((hook, index): Hook => ({
      id: `hook-${index}`,
      name: hook.description || `${hook.event} Hook`,
      event: hook.event,
      command: hook.command,
      scope: "全局",
      origin: "用户",
      enabled: !hook.disabled,
      lastResult: live.snapshot!.diagnostics.issues.some((issue) => issue.subsystem === "hooks" && issue.name === hook.event) ? "failed" : "never",
      highRisk: isRisky(hook.command),
    })));
  }, [live?.snapshot]);

  const persist = async (next: Hook[], label: string) => {
    if (!live) return false;
    return live.apply(label, async () => {
      if (!live.backend.SaveHooksSettingsForRoot) throw new Error("当前桌面后端缺少 Hooks 保存绑定");
      const hooks: HookConfigView[] = next.map((hook) => ({ event: hook.event, command: hook.command, description: hook.name, disabled: !hook.enabled }));
      await live.backend.SaveHooksSettingsForRoot("global", "", hooks);
    });
  };

  const list = pstate === "empty" ? [] : items;

  const save = (h: Hook) => {
    if (!h.name.trim() || !h.command.trim()) return toast.error("名称与命令不能为空");
    if (isRisky(h.command)) { setRiskConfirm(h); return; }
    commit(h);
  };
  const commit = (h: Hook) => {
    const withRisk = { ...h, highRisk: isRisky(h.command) };
    const next = h.id === "new" ? [...items, { ...withRisk, id: `hk${Date.now()}`, lastResult: "never" as const }] : items.map((x) => x.id === h.id ? withRisk : x);
    if (live) {
      void persist(next, "保存 Hook").then((ok) => { if (ok) { setEditing(null); setRiskConfirm(null); toast.success("Hook 已保存"); } else toast.error("Hook 保存失败", { description: live.error }); });
    } else { setItems(next); toast.success("Hook 已保存"); setEditing(null); setRiskConfirm(null); }
  };

  return (
    <SettingsBody title="Hooks" desc={`管理在${brand.productName}运行生命周期中自动执行的本地命令；Hook 以当前用户权限执行，并非运行在隔离环境中`}>
      {!live && <StateSwitcher value={pstate} onChange={setPState} options={[{ id: "normal", label: "正常列表" }, { id: "empty", label: "无 Hook" }]} />}
      {live?.error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{live.error}</div>}

      <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-800"><AlertTriangle className="size-4 shrink-0" />Hook 以当前用户权限在本机执行，不处于沙箱隔离中，请仅配置可信命令。</div>

      <Section title="Hook 列表" actions={
        <button onClick={() => setEditing({ id: "new", name: "", event: "会话开始", command: "", scope: "全局", origin: "用户", enabled: false, lastResult: "never" })} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" />新增 Hook</button>
      }>
        {list.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Webhook className="size-7 text-slate-300" /><p className="mt-2">还没有配置任何 Hook</p></div>
        ) : (
          <div className="space-y-2">
            {list.map((h) => {
              const r = resultMeta[h.lastResult];
              return (
                <div key={h.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] text-slate-900">{h.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-600">{h.event}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${h.origin === "插件" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500"}`}>{h.origin === "插件" ? "插件提供" : h.origin === "项目" ? "项目配置" : "用户配置"}</span>
                    {h.highRisk && <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] bg-rose-50 text-rose-700"><AlertTriangle className="size-3" />高风险</span>}
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${r.cls}`}>{r.label}</span>
                    <div className="ml-auto"><Toggle checked={h.enabled} onChange={(v) => {
                      if (h.origin === "插件") return toast.error("插件 Hook 请前往插件管理调整");
                      const next = items.map((x) => x.id === h.id ? { ...x, enabled: v } : x);
                      if (live) void persist(next, v ? "启用 Hook" : "停用 Hook").then((ok) => ok ? toast(v ? "已启用" : "已停用") : toast.error("Hook 状态保存失败", { description: live.error }));
                      else { setItems(next); toast(v ? "已启用" : "已停用"); }
                    }} /></div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11.5px] text-slate-500"><Terminal className="size-3.5 shrink-0" /><span className="truncate">{h.command}</span></div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-slate-400"><span>范围：{h.scope}</span><span>最近执行：{h.lastRun ?? "—"}</span></div>
                  {h.origin === "插件" ? (
                    <div className="mt-2.5 border-t border-slate-100 pt-2.5"><button onClick={() => navigate("settings", { tab: "plugin" })} className="flex items-center gap-1 text-[11.5px] text-violet-600 hover:underline"><ExternalLink className="size-3" />由插件 {plugins.find(p=>p.id===h.pluginId)?.name} 提供 · 前往插件管理</button></div>
                  ) : (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                      <button onClick={() => setEditing(h)} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{live ? "编辑" : "编辑 / 测试"}</button>
                      <button onClick={() => { const clone = { ...h, id: "new", name: h.name + " 副本", enabled: false }; setEditing(clone); }} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Copy className="size-3.5" />复制</button>
                      <button onClick={() => setDeleteId(h.id)} className="ml-auto flex items-center gap-1 text-[11.5px] text-rose-600 hover:underline"><Trash2 className="size-3.5" />删除</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {editing && <HookEditor hook={editing} liveMode={Boolean(live)} onClose={() => setEditing(null)} onSave={save} />}

      <ConfirmDialog open={!!riskConfirm} title="高风险命令确认" confirmText="我已了解风险，保存" onConfirm={() => riskConfirm && commit(riskConfirm)} onCancel={() => setRiskConfirm(null)}>
        该 Hook 的命令包含可能造成数据丢失或安全风险的操作，且以当前用户权限执行。确认保存？
        <div className="mt-2 rounded-lg bg-slate-50 p-2 font-mono text-[11.5px] text-slate-600">{riskConfirm?.command}</div>
      </ConfirmDialog>

      <ConfirmDialog open={!!deleteId} title="删除 Hook" confirmText="删除" onConfirm={() => {
        const next = items.filter((x) => x.id !== deleteId);
        if (live) void persist(next, "删除 Hook").then((ok) => { if (ok) { setDeleteId(null); toast.success("已删除 Hook"); } else toast.error("Hook 删除失败", { description: live.error }); });
        else { setItems(next); setDeleteId(null); toast.success("已删除 Hook"); }
      }} onCancel={() => setDeleteId(null)}>
        删除后该 Hook 将不再在生命周期事件中执行。确认删除？
      </ConfirmDialog>
    </SettingsBody>
  );
}

function HookEditor({ hook, liveMode, onClose, onSave }: { hook: Hook; liveMode: boolean; onClose: () => void; onSave: (h: Hook) => void }) {
  const [h, setH] = useState<Hook>(hook);
  const set = (patch: Partial<Hook>) => setH((p) => ({ ...p, ...patch }));
  const [test, setTest] = useState<Test>("idle");
  const [showConf, setShowConf] = useState(false);

  const runTest = (result: Exclude<Test, "idle" | "running">) => {
    setTest("running"); toast("正在测试 Hook…");
    setTimeout(() => setTest(result), 1100);
  };

  return (
    <Drawer title={hook.id === "new" ? "新增 Hook" : "编辑 Hook"} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
        <button onClick={() => setShowConf((s) => !s)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">保存前检查</button>
        <button onClick={() => onSave(h)} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">保存</button>
      </>
    }>
      <label className="block"><span className="text-[12px] text-slate-500">名称</span><input value={h.name} onChange={(e) => set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" /></label>
      <label className="block"><span className="text-[12px] text-slate-500">触发事件</span><Select value={h.event} onChange={(v) => set({ event: v })} options={EVENTS} /></label>
      <label className="block"><span className="text-[12px] text-slate-500">命令</span><input value={h.command} onChange={(e) => set({ command: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="./scripts/run.sh --flag" /></label>
      {!liveMode && <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-[12px] text-slate-500">工作目录</span><input defaultValue="${workspace}" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
        <label className="block"><span className="text-[12px] text-slate-500">超时（秒）</span><input defaultValue="30" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" /></label>
      </div>}
      {!liveMode && <label className="block"><span className="text-[12px] text-slate-500">环境变量（KEY=VALUE，每行一个）</span><textarea rows={2} className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="NODE_ENV=production" /></label>}
      {!liveMode && <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-[12px] text-slate-500">作用范围</span><Select value={h.scope} onChange={(v) => set({ scope: v })} options={["全局", "rill-web", "rillagent-cli"]} /></label>
        <label className="block"><span className="text-[12px] text-slate-500">失败处理</span><Select value="记录并继续" onChange={() => {}} options={["记录并继续", "阻断当前任务"]} /></label>
      </div>}

      {isRisky(h.command) && <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2.5 text-[12px] text-rose-700"><AlertTriangle className="size-4" />检测到高风险命令，保存时需要额外确认。</div>}

      {showConf && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px]">
          <div className="text-slate-500">将执行的完整命令：</div>
          <div className="mt-1 rounded bg-white p-2 font-mono text-[11.5px] text-slate-700">{h.command || "（空）"}</div>
          <div className="mt-2 text-slate-500">可访问的运行上下文：工作目录、指定环境变量、当前项目路径。凭据类环境变量在输出中将被隐藏。</div>
        </div>
      )}

      {!liveMode && <div className="rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-slate-800">测试运行</span>
          <div className="flex gap-1.5">
            <button onClick={() => runTest("ok")} className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-[11.5px] text-white hover:bg-teal-700"><Play className="size-3.5" />测试</button>
            <Select value="模拟成功" onChange={(v) => runTest(v === "模拟成功" ? "ok" : v === "模拟失败" ? "failed" : v === "模拟超时" ? "timeout" : "unavailable")} options={["模拟成功", "模拟失败", "模拟超时", "命令不可用"]} />
          </div>
        </div>
        {test !== "idle" && (
          <div className="mt-2 rounded-lg bg-slate-900 p-2.5 font-mono text-[11.5px] text-slate-100">
            {test === "running" && <div className="text-sky-300">运行中…</div>}
            {test === "ok" && <><div className="text-emerald-300">退出码 0 · 耗时 128ms</div><div className="text-slate-300">stdout: environment loaded, TOKEN=**** (已隐藏)</div></>}
            {test === "failed" && <><div className="text-rose-300">退出码 1 · 耗时 96ms</div><div className="text-slate-300">stderr: command failed: permission denied</div></>}
            {test === "timeout" && <div className="text-amber-300">执行超时（超过 30s），已终止</div>}
            {test === "unavailable" && <div className="text-rose-300">命令不可用：找不到可执行文件</div>}
          </div>
        )}
        {(test === "failed" || test === "timeout" || test === "unavailable") && <button onClick={() => runTest("ok")} className="mt-2 text-[11.5px] text-teal-700 hover:underline">重新测试</button>}
      </div>}
    </Drawer>
  );
}
