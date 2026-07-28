import { useState } from "react";
import { Plus, Bot as BotIcon, Trash2, Wifi, Send, Stethoscope, QrCode, ShieldAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SettingsBody } from "./Settings";
import { Section, Row, Select, Toggle, StateBadge, ConfirmDialog, Drawer } from "./kit";
import { bots as seedBots, models, type Bot } from "./data";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";
import { useRillSettingsOptional } from "../../settings/runtime";
import { LiveBotSettings } from "./live/LiveBotSettings";

type Pair = "unconfigured" | "waitingQR" | "waitingAuth" | "paired" | "pairFailed";

export function BotSettings() {
  const live = useRillSettingsOptional();
  return live ? <LiveBotSettings live={live} /> : <VisualBotSettings />;
}

function VisualBotSettings() {
  const { navigate, channels } = useStore();
  const [bots, setBots] = useState<Bot[]>(seedBots);
  const [editing, setEditing] = useState<Bot | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [globalOn, setGlobalOn] = useState(true);
  const [pair, setPair] = useState<Pair>("paired");

  const availableModels = models.filter((m) => m.available).map((m) => m.name);

  const toggleEnable = (b: Bot) => {
    if (!b.scope) return toast.error("未配置访问范围的连接不能启用");
    setBots((bs) => bs.map((x) => (x.id === b.id ? { ...x, enabled: !x.enabled, auth: !x.enabled ? "connected" : "disabled" } : x)));
    toast.success(!b.enabled ? "已启用连接" : "已停用连接", { description: !b.enabled ? undefined : "停用仅对后续消息生效" });
  };

  return (
    <SettingsBody title="机器人" desc="管理 QQ、飞书、Lark、微信机器人，并控制每个渠道的范围、模型与权限">
      <Section title="运行总控" desc="全局开关与消息队列">
        <Row label="机器人运行总开关" hint="关闭后所有渠道暂停接收消息"><Toggle checked={globalOn} onChange={setGlobalOn} /></Row>
        <Row label="队列容量"><Select value="100" onChange={() => {}} options={["50", "100", "200"]} /></Row>
        <Row label="消息合并等待"><Select value="800ms" onChange={() => {}} options={["关闭", "300ms", "800ms", "2s"]} /></Row>
        <Row label="队列满处理方式"><Select value="丢弃最旧" onChange={() => {}} options={["丢弃最旧", "拒绝新消息"]} /></Row>
        <Row label="忽略自身消息" hint="自身用户标识：ou_bot_9f2a"><Toggle checked onChange={() => {}} /></Row>
      </Section>

      <div className="mt-4">
        <Section title="渠道连接" desc="每个渠道的启用、认证、作用项目与关联会话" actions={
          <button onClick={() => setEditing({ id: "new", name: "", channel: "飞书/Lark", enabled: false, auth: "missingKey", model: "Opus 4.8", scope: "", sessions: 0, policy: "trusted" })} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" />新增连接</button>
        }>
          <div className="space-y-2">
            {bots.map((b) => (
              <div key={b.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600"><BotIcon className="size-4" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13.5px] text-slate-900">{b.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{b.channel}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{b.scope || "未配置范围"} · {b.sessions} 个关联会话 · 模型 {b.model}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {b.policy === "everyone" && <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600 ring-1 ring-rose-200"><ShieldAlert className="size-3" />所有人可用</span>}
                    <StateBadge state={b.enabled ? b.auth : "disabled"} />
                  </div>
                </div>
                {b.lastError && <div className="mt-2 rounded-md bg-rose-50 px-2.5 py-1.5 text-[11.5px] text-rose-700">最近错误：{b.lastError}</div>}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                  <button onClick={() => toggleEnable(b)} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{b.enabled ? "停用" : "启用"}</button>
                  <button onClick={() => setEditing(b)} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">编辑</button>
                  <button onClick={() => toast("正在测试连接…", { description: "1 秒后返回结果" })} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Wifi className="size-3.5" />测试连接</button>
                  <button onClick={() => setTestId(b.id)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Send className="size-3.5" />测试消息</button>
                  <button onClick={() => toast("连接诊断", { description: "只允许本地复制或导出，不发送到任何服务器" })} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Stethoscope className="size-3.5" />诊断</button>
                  <button onClick={() => setDeleteId(b.id)} className="ml-auto grid size-7 place-items-center rounded-lg text-rose-500 ring-1 ring-slate-200 hover:bg-rose-50"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {editing && (
        <BotEditor bot={editing} models={availableModels} pair={pair} setPair={setPair} onClose={() => setEditing(null)} onSave={(b) => {
          if (!b.scope) return toast.error("请先配置访问范围");
          if (b.id === "new") setBots((bs) => [...bs, { ...b, id: `b${Date.now()}` }]);
          else setBots((bs) => bs.map((x) => (x.id === b.id ? b : x)));
          toast.success("连接已保存"); setEditing(null);
        }} />
      )}

      {testId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-[15px] text-slate-900">发送测试消息</h3>
            <textarea rows={3} defaultValue={`你好，这是一条来自${brand.productName}的测试消息。`} className="mt-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setTestId(null)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
              <button onClick={() => { setTestId(null); toast.success("测试消息已发送", { description: "已投递到远端渠道" }); }} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">发送</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} title="删除渠道连接" onConfirm={() => { setBots((bs) => bs.filter((x) => x.id !== deleteId)); setDeleteId(null); toast.success("连接已删除"); }} onCancel={() => setDeleteId(null)} confirmText="删除连接">
        删除后该渠道将无法调用{brand.productName}，已关联会话仍会保留。凭据配置将一并移除。
      </ConfirmDialog>

      <button disabled={channels.length === 0} onClick={() => channels[0] && navigate("channel", { id: channels[0].id })} className="mt-4 flex items-center gap-1.5 text-[12px] text-teal-600 hover:underline disabled:text-slate-300 disabled:no-underline">
        <ExternalLink className="size-3.5" /> {channels.length > 0 ? "查看某个渠道的运行详情" : "暂无可查看的渠道"}
      </button>
    </SettingsBody>
  );
}

function BotEditor({ bot, models, pair, setPair, onClose, onSave }: { bot: Bot; models: string[]; pair: Pair; setPair: (p: Pair) => void; onClose: () => void; onSave: (b: Bot) => void }) {
  const [b, setB] = useState<Bot>(bot);
  const set = (patch: Partial<Bot>) => setB((p) => ({ ...p, ...patch }));
  const pairLabel: Record<Pair, string> = { unconfigured: "未配置", waitingQR: "等待扫码", waitingAuth: "等待授权", paired: "已配对", pairFailed: "配对失败" };

  return (
    <Drawer title={bot.id === "new" ? "新增渠道连接" : "编辑渠道连接"} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
        <button onClick={() => onSave(b)} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">保存</button>
      </>
    }>
      <label className="block"><span className="text-[12px] text-slate-500">连接名称</span><input value={b.name} onChange={(e) => set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" placeholder="例如：dev-rill 群机器人" /></label>
      <label className="block"><span className="text-[12px] text-slate-500">渠道类型</span>
        <select value={b.channel} onChange={(e) => set({ channel: e.target.value as Bot["channel"] })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option>飞书/Lark</option><option>QQ</option><option>微信</option></select>
      </label>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between"><span className="text-[12px] text-slate-500">凭据（环境变量）</span><span className="text-[11px] text-slate-400">不显示原文</span></div>
        <input className="mt-2 w-full rounded-md bg-white px-3 py-1.5 font-mono text-[12px] outline-none ring-1 ring-slate-200 focus:ring-teal-300" placeholder="FEISHU_APP_SECRET" />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[12px] text-slate-500">配对状态：</span><StateBadge state={pair === "paired" ? "connected" : pair === "pairFailed" ? "failed" : "connecting"} /><span className="text-[12px] text-slate-500">{pairLabel[pair]}</span>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => { setPair("waitingQR"); toast("请使用手机扫码"); }} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><QrCode className="size-3.5" />扫码接入</button>
          <button onClick={() => { setPair("paired"); toast.success("配对成功"); }} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">授权接入</button>
        </div>
      </div>

      <label className="block"><span className="text-[12px] text-slate-500">渠道模型</span><select value={b.model} onChange={(e) => set({ model: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{models.map((m) => <option key={m}>{m}</option>)}</select></label>
      <label className="block"><span className="text-[12px] text-slate-500">工具权限模式</span><select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option>只读</option><option>需确认</option><option>自动</option><option>YOLO（高风险）</option></select></label>
      <label className="block"><span className="text-[12px] text-slate-500">作用范围</span>
        <select value={b.scope} onChange={(e) => set({ scope: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option value="">未配置（不能启用）</option><option value="全局">全局</option><option value="rill-web">rill-web</option><option value="rillagent-cli">rillagent-cli</option></select>
      </label>
      {b.scope && b.scope !== "全局" && <label className="block"><span className="text-[12px] text-slate-500">项目路径</span><input defaultValue="~/work/rill/rill-web" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>}

      <div>
        <span className="text-[12px] text-slate-500">访问策略</span>
        <div className="mt-1 flex gap-2">
          {(["trusted", "everyone"] as const).map((p) => (
            <button key={p} onClick={() => set({ policy: p })} className={`flex-1 rounded-lg border p-2.5 text-left text-[12.5px] ${b.policy === p ? "border-teal-300 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
              <div className="flex items-center gap-1.5 text-slate-800">{p === "trusted" ? "仅可信用户" : "所有人可用"}{p === "everyone" && <ShieldAlert className="size-3.5 text-rose-500" />}</div>
              <div className="text-[11px] text-slate-400">{p === "trusted" ? "仅白名单用户可调用" : "任何人都可调用，风险高"}</div>
            </button>
          ))}
        </div>
        {b.policy === "everyone" && <p className="mt-1.5 text-[11.5px] text-rose-600">「所有人可用」将允许任意远端用户触发{brand.productName}，请谨慎开启。</p>}
        {b.policy === "trusted" && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            {["用户白名单", "群组白名单", "审批人", "管理员"].map((w) => (
              <div key={w} className="rounded-lg border border-slate-200 p-2"><div className="text-slate-500">{w}</div><button className="mt-1 text-[11.5px] text-teal-600 hover:underline">配置</button></div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
