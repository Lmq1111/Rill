import { useState } from "react";
import {
  Workflow, Search, Plus, Play, Pencil, Trash2, Power, ExternalLink, CheckCircle2,
  AlertTriangle, Loader2, ShieldAlert, X, Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { brand } from "../../../lib/brand";
import { PageShell } from "./PageShell";
import { useStore, projectName, type AutomationTask, type Channel } from "../../state/visualStore";

type Perm = AutomationTask["permission"];
type Result = NonNullable<AutomationTask["lastResult"]>;

const permDesc: Record<Perm, string> = {
  Ask: "每次敏感操作都需人工确认",
  Auto: "常规操作自动执行，高权限操作仍需确认",
  YOLO: "全部自动执行，风险最高",
};
const freqOptions: { id: AutomationTask["freqType"]; label: string }[] = [
  { id: "interval", label: "固定间隔" }, { id: "daily", label: "每天" }, { id: "weekly", label: "每周" },
  { id: "biweekly", label: "双周" }, { id: "monthly", label: "每月" }, { id: "yearly", label: "每年" },
];
const resultMeta: Record<Result, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  success: { label: "执行成功", icon: CheckCircle2, cls: "text-emerald-600" },
  failed: { label: "执行失败", icon: AlertTriangle, cls: "text-rose-600" },
  running: { label: "运行中", icon: Loader2, cls: "text-amber-600" },
  none: { label: "尚未运行", icon: Clock3, cls: "text-slate-400" },
};

function freqSummary(t: AutomationTask) {
  switch (t.freqType) {
    case "interval": return `每 ${t.intervalVal} ${t.intervalUnit}`;
    case "daily": return `每天 ${t.time}`;
    case "weekly": return `每${t.weekday} ${t.time}`;
    case "biweekly": return `每两周 ${t.weekday} ${t.time}`;
    case "monthly": return `每月 ${t.monthday} 号 ${t.time}`;
    case "yearly": return `每年 ${t.month} ${t.monthday} 号 ${t.time}`;
  }
}

export function Automation() {
  const { tasks, channels, projects, params, openSession, saveTask, deleteTask, runTaskNow, toggleTask } = useStore();
  const visualState = params.rillVisualState;
  const visualDraft: AutomationTask = {
    ...newTask(projects[0]?.id ?? "全局"),
    name: visualState === "automation-yolo-confirmation" ? "高权限发布巡检" : "",
    prompt: visualState === "automation-yolo-confirmation" ? "巡检发布流水线的高权限入口并给出收敛建议。" : "",
    permission: visualState === "automation-yolo-confirmation" ? "YOLO" : "Ask",
  };
  const [query, setQuery] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("全部");
  const [scopeFilter, setScopeFilter] = useState("全部范围");
  const [editing, setEditing] = useState<AutomationTask | null>(
    visualState === "automation-task-drawer" || visualState === "automation-yolo-confirmation" ? visualDraft : null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [yoloConfirm, setYoloConfirm] = useState<null | { action: "run" | "enable"; task: AutomationTask }>(
    visualState === "automation-yolo-confirmation" ? { action: "enable", task: visualDraft } : null,
  );

  const projectOk = (scope: string) => scope === "全局" || projects.some((p) => p.id === scope);

  const list = tasks.filter((t) => {
    if (query && !t.name.includes(query)) return false;
    if (enabledFilter === "已启用" && !t.enabled) return false;
    if (enabledFilter === "已停用" && t.enabled) return false;
    if (scopeFilter !== "全部范围" && projectName(t.scope) !== scopeFilter) return false;
    return true;
  });

  const tryRun = (t: AutomationTask) => {
    if (!projectOk(t.scope)) return toast.error("绑定项目不可用，无法运行");
    if (t.permission === "YOLO") return setYoloConfirm({ action: "run", task: t });
    runTaskNow(t.id);
  };
  const tryToggle = (t: AutomationTask) => {
    if (!t.enabled && !projectOk(t.scope)) return toast.error("绑定项目不可用，无法启用");
    if (!t.enabled && t.permission === "YOLO") return setYoloConfirm({ action: "enable", task: t });
    toggleTask(t.id);
  };

  return (
    <PageShell icon={Workflow} title="自动化任务" subtitle="按计划自动执行的 Agent 任务"
      actions={<button onClick={() => setEditing(newTask(projects[0]?.id ?? "全局"))} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" /> 新增任务</button>}>
      <div className="mx-auto h-full max-w-4xl overflow-y-auto p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
            <Search className="size-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按名称搜索任务" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
          </div>
          <select value={enabledFilter} onChange={(e) => setEnabledFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[12px] text-slate-600">{["全部", "已启用", "已停用"].map((s) => <option key={s}>{s}</option>)}</select>
          <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[12px] text-slate-600">{["全部范围", "rill-web", "rillagent-cli", "全局"].map((s) => <option key={s}>{s}</option>)}</select>
        </div>

        {list.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center"><Workflow className="size-8 text-slate-300" /><p className="mt-2 text-[13px] text-slate-400">{tasks.length === 0 ? "还没有自动化任务" : "没有匹配的任务"}</p></div>
        ) : (
          <div className="space-y-2.5">
            {list.map((t) => {
              const rm = resultMeta[t.lastResult ?? "none"];
              const RIcon = rm.icon;
              const unavailable = !projectOk(t.scope);
              const lastSid = t.generatedSessionIds[0] ?? t.reuseSessionId;
              return (
                <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] text-slate-900">{t.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${t.enabled ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"}`}>{t.enabled ? "已启用" : "已停用"}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{projectName(t.scope)}</span>
                    {unavailable && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600 ring-1 ring-rose-200">项目不可用</span>}
                    {t.permission === "YOLO" && <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600 ring-1 ring-rose-200"><ShieldAlert className="size-3" />高权限风险</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-400">
                    <span>周期：{freqSummary(t)}</span><span>时区：{t.tz}</span><span>下次：{t.nextRun}</span><span>上次：{t.lastRun ?? "—"}</span>
                    <span className={`flex items-center gap-1 ${rm.cls}`}><RIcon className={`size-3.5 ${t.lastResult === "running" ? "animate-spin" : ""}`} />{rm.label}</span>
                    <span>权限：{t.permission}</span><span>会话：{t.sessionPolicy === "new" ? "每次新建" : "复用同一会话"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button onClick={() => tryRun(t)} disabled={t.lastResult === "running"} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[12px] text-white hover:bg-teal-700 disabled:opacity-50"><Play className="size-3.5" />立即运行</button>
                    <button onClick={() => tryToggle(t)} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Power className="size-3.5" />{t.enabled ? "停用" : "启用"}</button>
                    <button onClick={() => setEditing(t)} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="size-3.5" />编辑</button>
                    {lastSid && <button onClick={() => openSession(lastSid)} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><ExternalLink className="size-3.5" />打开会话</button>}
                    <button onClick={() => setDeleteId(t.id)} className="ml-auto flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"><Trash2 className="size-3.5" />删除</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <TaskEditor task={editing} channels={channels} projectOk={projectOk} onClose={() => setEditing(null)}
          onSave={(t) => {
            if (!t.name.trim()) return toast.error("请填写任务名称");
            if (!projectOk(t.scope)) return toast.error("任务必须绑定有效项目");
            const commit = () => { saveTask(t); setEditing(null); };
            if (t.permission === "YOLO") { setYoloConfirm({ action: "enable", task: t }); }
            else commit();
          }} />
      )}

      {yoloConfirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600"><ShieldAlert className="size-5" /><h3 className="text-[15px] text-slate-900">高权限（YOLO）确认</h3></div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">任务「{yoloConfirm.task.name}」为 <b className="text-rose-600">YOLO 全自动</b> 权限，将不经人工确认执行全部操作（含高风险与写入）。你确定要{yoloConfirm.action === "run" ? "立即运行" : "保存并启用"}吗？</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setYoloConfirm(null)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
              <button onClick={() => {
                if (yoloConfirm.action === "run") runTaskNow(yoloConfirm.task.id);
                else { saveTask(yoloConfirm.task); setEditing(null); }
                setYoloConfirm(null);
              }} className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-rose-700">我已知晓，继续</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600"><AlertTriangle className="size-5" /><h3 className="text-[15px] text-slate-900">删除任务</h3></div>
            <p className="mt-2 text-[13px] text-slate-600">删除任务不会删除它已经生成的会话。确认删除该任务？</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
              <button onClick={() => { deleteTask(deleteId); setDeleteId(null); }} className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-rose-700">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function newTask(scope: string): AutomationTask {
  return { id: "new", name: "", prompt: "", scope, freqType: "daily", intervalVal: 6, intervalUnit: "小时", time: "08:00", weekday: "周一", monthday: "1", month: "1 月", window: "±10 分钟", enabled: true, permission: "Ask", sessionPolicy: "new", push: false, tz: "UTC+8 (Asia/Shanghai)", lastResult: "none", nextRun: "—", generatedSessionIds: [] };
}

function TaskEditor({ task, channels, projectOk, onClose, onSave }: { task: AutomationTask; channels: Channel[]; projectOk: (s: string) => boolean; onClose: () => void; onSave: (t: AutomationTask) => void }) {
  const { projects } = useStore();
  const [t, setT] = useState<AutomationTask>(task);
  const set = (patch: Partial<AutomationTask>) => setT((prev) => ({ ...prev, ...patch }));
  const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const months = ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月", "8 月", "9 月", "10 月", "11 月", "12 月"];
  const connChannels = channels.filter((c) => c.connState === "connected");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 className="text-[15px] text-slate-900">{t.id === "new" ? "新增任务" : "编辑任务"}</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block"><span className="text-[12px] text-slate-500">任务名称</span><input value={t.name} onChange={(e) => set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" placeholder="例如：每日构建产物巡检" /></label>
          <label className="block"><span className="text-[12px] text-slate-500">任务提示词</span><textarea value={t.prompt} onChange={(e) => set({ prompt: e.target.value })} rows={3} className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" placeholder={`描述${brand.productName}每次运行应完成的目标`} /></label>
          <label className="block">
            <span className="text-[12px] text-slate-500">作用范围</span>
            <select value={t.scope} onChange={(e) => set({ scope: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option value="全局">全局</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            {!projectOk(t.scope) && <p className="mt-1 flex items-center gap-1 text-[11.5px] text-rose-600"><AlertTriangle className="size-3.5" />该项目当前不可用，保存 / 运行将被阻止。</p>}
          </label>

          <div>
            <span className="text-[12px] text-slate-500">执行频率</span>
            <select value={t.freqType} onChange={(e) => set({ freqType: e.target.value as AutomationTask["freqType"] })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{freqOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {t.freqType === "interval" && (<>
                <label className="block"><span className="text-[11px] text-slate-400">间隔</span><input type="number" min={1} value={t.intervalVal} onChange={(e) => set({ intervalVal: +e.target.value })} className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]" /></label>
                <label className="block"><span className="text-[11px] text-slate-400">单位</span><select value={t.intervalUnit} onChange={(e) => set({ intervalUnit: e.target.value })} className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]">{["分钟", "小时", "天"].map((u) => <option key={u}>{u}</option>)}</select></label>
              </>)}
              {(t.freqType === "weekly" || t.freqType === "biweekly") && <label className="block"><span className="text-[11px] text-slate-400">星期</span><select value={t.weekday} onChange={(e) => set({ weekday: e.target.value })} className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]">{weekdays.map((w) => <option key={w}>{w}</option>)}</select></label>}
              {(t.freqType === "monthly" || t.freqType === "yearly") && <label className="block"><span className="text-[11px] text-slate-400">日期</span><select value={t.monthday} onChange={(e) => set({ monthday: e.target.value })} className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]">{Array.from({ length: 28 }, (_, i) => `${i + 1}`).map((d) => <option key={d}>{d}</option>)}</select></label>}
              {t.freqType === "yearly" && <label className="block"><span className="text-[11px] text-slate-400">月份</span><select value={t.month} onChange={(e) => set({ month: e.target.value })} className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]">{months.map((m) => <option key={m}>{m}</option>)}</select></label>}
              {t.freqType !== "interval" && <label className="block"><span className="text-[11px] text-slate-400">时间</span><input type="time" value={t.time} onChange={(e) => set({ time: e.target.value })} className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]" /></label>}
              <label className="block"><span className="text-[11px] text-slate-400">执行窗口</span><select value={t.window} onChange={(e) => set({ window: e.target.value })} className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]">{["精确", "±5 分钟", "±10 分钟", "±30 分钟"].map((w) => <option key={w}>{w}</option>)}</select></label>
            </div>
          </div>

          <label className="block"><span className="text-[12px] text-slate-500">时区</span><select value={t.tz} onChange={(e) => set({ tz: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{["UTC+8 (Asia/Shanghai)", "UTC+0 (UTC)", "UTC-8 (America/Los_Angeles)", "跟随系统"].map((z) => <option key={z}>{z}</option>)}</select></label>

          <div>
            <span className="text-[12px] text-slate-500">权限等级</span>
            <div className="mt-1 space-y-1.5">
              {(["Ask", "Auto", "YOLO"] as Perm[]).map((p) => (
                <button key={p} onClick={() => set({ permission: p })} className={`flex w-full items-start gap-2 rounded-lg border p-2.5 text-left ${t.permission === p ? "border-teal-300 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className={`mt-0.5 size-3.5 rounded-full border-2 ${t.permission === p ? "border-teal-600 bg-teal-600" : "border-slate-300"}`} />
                  <div><div className="flex items-center gap-1.5 text-[13px] text-slate-800">{p}{p === "YOLO" && <ShieldAlert className="size-3.5 text-rose-500" />}</div><div className="text-[11.5px] text-slate-400">{permDesc[p]}</div></div>
                </button>
              ))}
            </div>
            {t.permission === "YOLO" && <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-rose-600"><AlertTriangle className="size-3.5" />高权限自动任务将不经确认执行全部操作，保存 / 启用 / 运行前会再次确认。</p>}
          </div>

          <label className="block"><span className="text-[12px] text-slate-500">会话策略</span><select value={t.sessionPolicy} onChange={(e) => set({ sessionPolicy: e.target.value as AutomationTask["sessionPolicy"] })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option value="new">每次新建会话</option><option value="reuse">复用同一会话</option></select></label>

          <label className="flex items-center justify-between">
            <div><div className="text-[13px] text-slate-800">推送到机器人渠道</div><div className="text-[11.5px] text-slate-400">把执行结果推送到已连接渠道</div></div>
            <input type="checkbox" checked={t.push} onChange={(e) => set({ push: e.target.checked, pushChannelId: e.target.checked ? (connChannels[0]?.id) : undefined })} className="size-4 accent-teal-600" />
          </label>
          {t.push && <label className="block"><span className="text-[12px] text-slate-500">推送渠道</span><select value={t.pushChannelId ?? ""} onChange={(e) => set({ pushChannelId: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{connChannels.length === 0 ? <option value="">无已连接渠道</option> : connChannels.map((c) => <option key={c.id} value={c.id}>{c.type} · {c.name}</option>)}</select></label>}

          <label className="flex items-center justify-between"><span className="text-[13px] text-slate-800">启用任务</span><input type="checkbox" checked={t.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="size-4 accent-teal-600" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button onClick={onClose} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
          <button onClick={() => onSave(t)} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">保存</button>
        </div>
      </div>
    </div>
  );
}
