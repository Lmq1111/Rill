import { useEffect, useMemo, useState } from "react";
import { Bot as BotIcon, ExternalLink, Plus, QrCode, Stethoscope, Trash2, Wifi } from "lucide-react";
import type { BotConnectionDiagnostic, BotConnectionView, BotInstallStartResult, BotSettingsView } from "../../../../lib/types";
import type { RillSettingsContextValue } from "../../../settings/runtime";
import { useStore } from "../../../state/visualStore";
import { SettingsBody } from "../Settings";
import { ConfirmDialog, Drawer, Row, SaveBar, Section, Select, StateBadge, Toggle } from "../kit";

function cloneBot(bot: BotSettingsView): BotSettingsView {
  return structuredClone(bot);
}

function connectionState(connection: BotConnectionView) {
  if (!connection.enabled) return "disabled";
  if (!connection.credential.secretSet) return "missingKey";
  if (connection.status === "error") return "failed";
  if (connection.status === "pending") return "connecting";
  return connection.status === "connected" ? "connected" : "onDemand";
}

export function LiveBotSettings({ live }: { live: RillSettingsContextValue }) {
  const saved = live.snapshot?.settings.bot;
  const { navigate, channels } = useStore();
  const [draft, setDraft] = useState<BotSettingsView | null>(saved ? cloneBot(saved) : null);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<BotConnectionView | null>(null);
  const [deleteId, setDeleteId] = useState("");
  const [diagnostics, setDiagnostics] = useState<Record<string, BotConnectionDiagnostic>>({});
  const [install, setInstall] = useState<BotInstallStartResult | null>(null);
  const [installTarget, setInstallTarget] = useState("feishu");

  useEffect(() => {
    if (!saved) return;
    setDraft(cloneBot(saved));
    setDirty(false);
  }, [saved]);

  const models = useMemo(() => {
    const refs = (live.snapshot?.settings.providers ?? []).flatMap((provider) => provider.added ? provider.models.map((model) => `${provider.name}/${model}`) : []);
    for (const value of [saved?.model, ...(saved?.connections.map((connection) => connection.model) ?? [])]) if (value && !refs.includes(value)) refs.push(value);
    return refs.length > 0 ? refs : [""];
  }, [live.snapshot?.settings.providers, saved]);

  if (!draft || !saved) {
    return <SettingsBody title="机器人" desc="管理 QQ、飞书、Lark、微信机器人，并控制每个渠道的范围、模型与权限"><div className="rounded-xl border border-slate-200 bg-white p-5 text-[13px] text-slate-500">{live.loading ? "正在读取机器人设置…" : live.error || "机器人设置不可用"}</div></SettingsBody>;
  }

  const patchDraft = (patch: Partial<BotSettingsView>) => {
    setDraft((current) => current ? { ...current, ...patch } : current);
    setDirty(true);
  };

  const saveDraft = async () => {
    const ok = await live.apply("保存机器人默认行为", async () => {
      if (!live.backend.SetBotSettings) throw new Error("当前桌面后端缺少机器人设置保存绑定");
      await live.backend.SetBotSettings(draft);
    });
    if (ok) setDirty(false);
  };

  const persistConnections = (connections: BotConnectionView[], label: string) => live.apply(label, async () => {
    if (!live.backend.SetBotSettings) throw new Error("当前桌面后端缺少机器人连接保存绑定");
    await live.backend.SetBotSettings({ ...saved, connections });
  });

  const inspect = async (connection: BotConnectionView, test: boolean) => {
    try {
      const binding = test ? live.backend.TestBotConnection : live.backend.DiagnoseBotConnection;
      if (!binding) throw new Error(test ? "当前桌面后端缺少连接测试绑定" : "当前桌面后端缺少连接诊断绑定");
      const result = test
        ? await live.backend.TestBotConnection!(connection.id)
        : await live.backend.DiagnoseBotConnection!(connection.id);
      setDiagnostics((current) => ({ ...current, [connection.id]: result }));
    } catch (error) {
      setDiagnostics((current) => ({ ...current, [connection.id]: {
        id: connection.id,
        label: connection.label,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        messageId: "",
        phase: "runtime",
        code: "request_failed",
        reportKind: "",
        reportDetail: "",
        occurredAt: new Date().toISOString(),
      } }));
    }
  };

  const startInstall = async () => {
    try {
      if (!live.backend.StartBotConnectionInstall) throw new Error("当前桌面后端缺少机器人安装绑定");
      const provider = installTarget === "weixin" ? "weixin" : "feishu";
      const domain = installTarget === "lark" ? "lark" : installTarget === "weixin" ? "weixin" : "feishu";
      setInstall(await live.backend.StartBotConnectionInstall(provider, domain));
    } catch (error) {
      setDiagnostics((current) => ({ ...current, __install__: {
        id: "__install__", label: "新增连接", status: "error", message: error instanceof Error ? error.message : String(error), messageId: "", phase: "install", code: "install_failed", reportKind: "", reportDetail: "", occurredAt: new Date().toISOString(),
      } }));
    }
  };

  const pollInstall = async () => {
    if (!install) return;
    try {
      if (!live.backend.PollBotConnectionInstall) throw new Error("当前桌面后端缺少机器人授权轮询绑定");
      const result = await live.backend.PollBotConnectionInstall(install.installId);
      if (result.error) throw new Error(result.error);
      if (result.done) {
        setInstall(null);
        await live.reload();
      }
    } catch (error) {
      setDiagnostics((current) => ({ ...current, __install__: {
        id: "__install__", label: "新增连接", status: "error", message: error instanceof Error ? error.message : String(error), messageId: "", phase: "install", code: "install_failed", reportKind: "", reportDetail: "", occurredAt: new Date().toISOString(),
      } }));
    }
  };

  return (
    <SettingsBody title="机器人" desc="管理 QQ、飞书、Lark、微信机器人，并控制每个渠道的范围、模型与权限">
      {live.error && <div role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{live.error}</div>}
      <Section title="运行总控" desc="全局开关与消息队列">
        <Row label="机器人运行总开关" hint="关闭后所有渠道暂停接收消息"><Toggle checked={draft.enabled} onChange={(enabled) => patchDraft({ enabled })} /></Row>
        <Row label="默认模型"><Select value={draft.model} onChange={(model) => patchDraft({ model })} options={models} /></Row>
        <Row label="默认工具权限"><Select value={draft.toolApprovalMode || "ask"} onChange={(toolApprovalMode) => patchDraft({ toolApprovalMode })} options={["ask", "auto", "yolo"]} /></Row>
        <Row label="队列容量"><Select value={String(draft.queueCap)} onChange={(value) => patchDraft({ queueCap: Number(value) })} options={["50", "100", "200"]} /></Row>
        <Row label="消息合并等待"><Select value={String(draft.debounceMs)} onChange={(value) => patchDraft({ debounceMs: Number(value) })} options={["0", "300", "800", "2000"]} /></Row>
        <Row label="队列满处理方式"><Select value={draft.queueDrop || "oldest"} onChange={(queueDrop) => patchDraft({ queueDrop })} options={["oldest", "newest"]} /></Row>
        <Row label="忽略自身消息"><Toggle checked={draft.ignoreSelfMessages} onChange={(ignoreSelfMessages) => patchDraft({ ignoreSelfMessages })} /></Row>
      </Section>
      <SaveBar dirty={dirty} saving={live.saving} onSave={() => void saveDraft()} onReset={() => { setDraft(cloneBot(saved)); setDirty(false); }} />

      <div className="mt-4"><Section title="渠道连接" desc="凭据原文不会回传；凭据更新与白名单可在渠道详情完成" actions={<button disabled={live.saving} onClick={() => setInstall({ ok: false, provider: "", domain: "", installId: "", url: "", deviceCode: "", userCode: "", interval: 0, expireIn: 0, message: "choose" })} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white disabled:opacity-40"><Plus className="size-4" />新增连接</button>}>
        {saved.connections.length === 0 ? <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><BotIcon className="size-7 text-slate-300" /><p className="mt-2">还没有渠道连接</p></div> : <div className="space-y-2">
          {saved.connections.map((connection) => {
            const diagnostic = diagnostics[connection.id];
            return <div key={connection.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2"><div className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600"><BotIcon className="size-4" /></div><div className="min-w-0"><div className="flex items-center gap-1.5"><span className="text-[13.5px] text-slate-900">{connection.label || connection.id}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{connection.domain}</span></div><div className="text-[11px] text-slate-400">{connection.workspaceRoot || "全局"} · {connection.sessionMappings.length} 个关联会话 · 模型 {connection.model || saved.model || "默认"}</div></div><div className="ml-auto"><StateBadge state={connectionState(connection)} /></div></div>
              {(connection.lastError || diagnostic) && <div className={`mt-2 rounded-md px-2.5 py-1.5 text-[11.5px] ${(diagnostic?.status === "ok" || diagnostic?.status === "connected") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{diagnostic?.message || connection.lastError}</div>}
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                <button disabled={live.saving} onClick={() => void persistConnections(saved.connections.map((candidate) => candidate.id === connection.id ? { ...candidate, enabled: !candidate.enabled } : candidate), connection.enabled ? "停用机器人连接" : "启用机器人连接")} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40">{connection.enabled ? "停用" : "启用"}</button>
                <button disabled={live.saving} onClick={() => setEditing(structuredClone(connection))} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200">编辑</button>
                <button onClick={() => void inspect(connection, true)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200"><Wifi className="size-3.5" />测试连接</button>
                <button onClick={() => void inspect(connection, false)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200"><Stethoscope className="size-3.5" />诊断</button>
                <button onClick={() => setDeleteId(connection.id)} className="ml-auto grid size-7 place-items-center rounded-lg text-rose-500 ring-1 ring-slate-200"><Trash2 className="size-3.5" /></button>
              </div>
            </div>;
          })}
        </div>}
      </Section></div>

      <button disabled={channels.length === 0} onClick={() => channels[0] && navigate("channel", { id: channels[0].id })} className="mt-4 flex items-center gap-1.5 text-[12px] text-teal-600 hover:underline disabled:text-slate-300 disabled:no-underline">
        <ExternalLink className="size-3.5" /> {channels.length > 0 ? "查看某个渠道的运行详情" : "暂无可查看的渠道"}
      </button>

      {editing && <Drawer title={`编辑渠道连接 · ${editing.label || editing.id}`} onClose={() => setEditing(null)} footer={<><button onClick={() => setEditing(null)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200">取消</button><button disabled={live.saving || !editing.label.trim()} onClick={() => void persistConnections(saved.connections.map((connection) => connection.id === editing.id ? editing : connection), "保存机器人连接").then((ok) => { if (ok) setEditing(null); })} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white disabled:opacity-40">保存</button></>}>
        <label className="block"><span className="text-[12px] text-slate-500">连接名称</span><input value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" /></label>
        <label className="block"><span className="text-[12px] text-slate-500">渠道模型</span><select value={editing.model} onChange={(event) => setEditing({ ...editing, model: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{models.map((model) => <option key={model}>{model}</option>)}</select></label>
        <label className="block"><span className="text-[12px] text-slate-500">工具权限模式</span><select value={editing.toolApprovalMode || "ask"} onChange={(event) => setEditing({ ...editing, toolApprovalMode: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option value="ask">需确认</option><option value="auto">自动</option><option value="yolo">YOLO（高风险）</option></select></label>
        <label className="block"><span className="text-[12px] text-slate-500">项目路径（留空表示全局）</span><input value={editing.workspaceRoot} onChange={(event) => setEditing({ ...editing, workspaceRoot: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500"><div className="flex items-center gap-1.5 text-slate-700"><QrCode className="size-4" />凭据状态：{editing.credential.secretSet ? "已安全保存" : "未配置"}</div><p className="mt-1">密钥原文不会显示；请在对应渠道详情中更新凭据和访问白名单。</p></div>
      </Drawer>}

      {install && <Drawer title="新增渠道连接" onClose={() => setInstall(null)} footer={install.installId ? <button onClick={() => void pollInstall()} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white">完成授权后检查</button> : <button onClick={() => void startInstall()} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white">开始接入</button>}>
        {!install.installId ? <><label className="block"><span className="text-[12px] text-slate-500">渠道类型</span><select value={installTarget} onChange={(event) => setInstallTarget(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option value="feishu">飞书</option><option value="lark">Lark</option><option value="weixin">微信</option></select></label>{diagnostics.__install__ && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-[12px] text-rose-700">{diagnostics.__install__.message}</div>}</> : <div className="space-y-3"><div className="rounded-lg bg-sky-50 p-3 text-[12px] text-sky-700">授权已启动。请按后端返回信息完成授权，再点击“完成授权后检查”。</div>{install.url && <a href={install.url} target="_blank" rel="noreferrer" className="block break-all font-mono text-[12px] text-teal-700 underline">{install.url}</a>}{install.userCode && <div className="rounded-lg bg-slate-50 p-3 font-mono text-[14px] text-slate-700">授权码：{install.userCode}</div>}</div>}
      </Drawer>}

      <ConfirmDialog open={Boolean(deleteId)} title="删除渠道连接" onCancel={() => setDeleteId("")} onConfirm={() => void persistConnections(saved.connections.filter((connection) => connection.id !== deleteId), "删除机器人连接").then((ok) => { if (ok) setDeleteId(""); })} confirmText="删除连接">删除后该渠道将无法调用 Rill；已存在的本地会话不会被删除。</ConfirmDialog>
    </SettingsBody>
  );
}
