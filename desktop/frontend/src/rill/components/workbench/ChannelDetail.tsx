import { useState } from "react";
import {
  MessageSquare, Copy, ExternalLink, Settings2, ShieldCheck, Users, AlertTriangle,
  CheckCircle2, Loader2, Ban, EyeOff, Link2, Link2Off, Plus, Trash2, X, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { brand } from "../../../lib/brand";
import { writeClipboardText } from "../../../lib/clipboard";
import { PageShell } from "./PageShell";
import { useStore, projectName, type Channel } from "../../state/visualStore";

const connMeta: Record<Channel["connState"], { label: string; icon: typeof CheckCircle2; cls: string; spin?: boolean }> = {
  connected: { label: "已连接", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  failed: { label: "连接失败", icon: AlertTriangle, cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  credExpired: { label: "凭证过期", icon: AlertTriangle, cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  missingConfig: { label: "配置未完成", icon: Loader2, cls: "bg-amber-50 text-amber-700 ring-amber-200", spin: true },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className="text-[13px] text-slate-800">{children}</span>
    </div>
  );
}

export async function copyRemoteChannelID(remoteId: string, writer = writeClipboardText) {
  if (!remoteId.trim()) return false;
  return writer(remoteId);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function ChannelSettingsDialog({ channel, onClose }: { channel: Channel; onClose: () => void }) {
  const { projects, saveChannel, saveChannelSecret } = useStore();
  const [name, setName] = useState(channel.name);
  const [projectId, setProjectId] = useState(channel.projectId ?? "");
  const [whitelistOn, setWhitelistOn] = useState(channel.whitelistOn);
  const [policy, setPolicy] = useState(channel.policy);
  const [users, setUsers] = useState(channel.users);
  const [groups, setGroups] = useState(channel.groups);
  const [userInput, setUserInput] = useState("");
  const [groupInput, setGroupInput] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const availableProjects = projects.filter((project) => project.status === "ok");
  const missingProject = channel.workspaceRoot && !channel.projectId;

  const addValue = (kind: "user" | "group") => {
    const value = (kind === "user" ? userInput : groupInput).trim();
    if (!value) return;
    if (kind === "user") {
      setUsers((current) => uniqueValues([...current, value]));
      setUserInput("");
    } else {
      setGroups((current) => uniqueValues([...current, value]));
      setGroupInput("");
    }
  };

  const persist = async () => {
    setSaving(true);
    const ok = await saveChannel(channel.id, { name, projectId, whitelistOn, policy, users, groups });
    setSaving(false);
    if (ok) onClose();
  };

  const persistSecret = async () => {
    if (!secret.trim()) return;
    setSaving(true);
    const ok = await saveChannelSecret(channel.id, secret);
    setSaving(false);
    if (ok) setSecret("");
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/25 p-6" role="dialog" aria-modal="true" aria-label="机器人设置">
      <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" data-testid="rill-channel-settings">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div><div className="text-[15px] font-medium text-slate-900">机器人设置</div><div className="text-[12px] text-slate-400">{channel.type} · 保存后由 Bot 运行时重新加载</div></div>
          <button onClick={onClose} aria-label="关闭机器人设置" className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-5 p-5">
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="text-[12px] font-medium text-slate-600">基础配置</div>
            <label className="block text-[12px] text-slate-500">连接名称<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-teal-500" /></label>
            <label className="block text-[12px] text-slate-500">项目路径
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-teal-500">
                <option value="">全局</option>
                {missingProject && <option value="__unavailable" disabled>不可用 · {channel.workspaceRoot}</option>}
                {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.path}</option>)}
              </select>
            </label>
            {missingProject && <div className="rounded-lg bg-amber-50 p-2.5 text-[11.5px] text-amber-700 ring-1 ring-amber-200">原项目路径不可用，保存前请选择全局或一个当前可访问的项目。</div>}
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <button onClick={() => setWhitelistOn((value) => !value)} className={`rounded-lg px-3 py-1.5 ring-1 ${whitelistOn ? "bg-teal-50 text-teal-700 ring-teal-200" : "bg-white text-slate-500 ring-slate-200"}`}>{whitelistOn ? "白名单已启用" : "白名单未启用"}</button>
              <button onClick={() => setPolicy((value) => value === "trusted" ? "everyone" : "trusted")} className="rounded-lg bg-white px-3 py-1.5 text-slate-600 ring-1 ring-slate-200">{policy === "trusted" ? "仅可信用户" : "所有人可用"}</button>
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
            {(["user", "group"] as const).map((kind) => {
              const values = kind === "user" ? users : groups;
              const input = kind === "user" ? userInput : groupInput;
              const setInput = kind === "user" ? setUserInput : setGroupInput;
              return <div key={kind}>
                <div className="mb-2 text-[12px] font-medium text-slate-600">{kind === "user" ? "白名单成员" : "白名单群组"}</div>
                <div className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addValue(kind); } }} placeholder={kind === "user" ? "输入用户 ID" : "输入群组 ID"} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-teal-500" /><button onClick={() => addValue(kind)} aria-label={kind === "user" ? "添加成员" : "添加群组"} className="grid size-8 place-items-center rounded-lg bg-teal-600 text-white"><Plus className="size-4" /></button></div>
                <div className="mt-2 space-y-1.5">{values.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-[11.5px] text-slate-400">尚未配置</div> : values.map((value) => <div key={value} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 font-mono text-[11.5px] text-slate-600"><span className="truncate">{value}</span><button onClick={() => kind === "user" ? setUsers((current) => current.filter((item) => item !== value)) : setGroups((current) => current.filter((item) => item !== value))} aria-label={`删除 ${value}`} className="text-slate-400 hover:text-rose-600"><Trash2 className="size-3.5" /></button></div>)}</div>
              </div>;
            })}
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium text-slate-600"><KeyRound className="size-4 text-slate-400" />安全凭证更新</div>
            <div className="mt-1 text-[11.5px] text-slate-400">存储引用：{channel.credentialEnv || "未配置"}。现有密钥和新密钥均不会回显。</div>
            <div className="mt-3 flex gap-2"><input type="password" autoComplete="new-password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="输入新密钥或 Token" disabled={!channel.credentialEnv || saving} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-teal-500 disabled:bg-slate-50" /><button onClick={() => void persistSecret()} disabled={!secret.trim() || !channel.credentialEnv || saving} className="rounded-lg bg-slate-800 px-3 py-2 text-[12px] text-white disabled:opacity-40">安全更新</button></div>
          </section>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4"><button onClick={onClose} className="rounded-lg bg-white px-3.5 py-2 text-[12px] text-slate-600 ring-1 ring-slate-200">取消</button><button onClick={() => void persist()} disabled={saving || !name.trim() || projectId === "__unavailable"} className="rounded-lg bg-teal-600 px-3.5 py-2 text-[12px] text-white disabled:opacity-40">{saving ? "保存中…" : "保存设置"}</button></div>
      </div>
    </div>
  );
}

export function ChannelDetail() {
  const { params, channels, sessions, projects, navigate, openSession, saveChannel, reconnectChannel } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const ch = params.id ? channels.find((candidate) => candidate.id === params.id) : channels[0];
  if (!ch) return <PageShell icon={MessageSquare} title="消息渠道详情"><div className="grid h-full place-items-center text-[13px] text-slate-400">未找到渠道</div></PageShell>;

  const meta = connMeta[ch.connState];
  const MetaIcon = meta.icon;
  const linked = sessions.filter((session) => ch.sessionIds.includes(session.id) || session.channelId === ch.id);
  const reconnect = async () => {
    setReconnecting(true);
    await reconnectChannel(ch.id);
    setReconnecting(false);
  };
  const copyRemote = async () => {
    if (await copyRemoteChannelID(ch.remoteId)) toast.success("已复制远端标识");
    else toast.error("复制失败", { description: "剪贴板权限被拒绝，请检查系统权限后重试" });
  };

  return (
    <PageShell icon={MessageSquare} title="消息渠道详情" subtitle={`${ch.type} · ${ch.name}`}
      actions={<><button onClick={() => setSettingsOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Settings2 className="size-4" /> 机器人设置</button><button onClick={() => void saveChannel(ch.id, { whitelistOn: !ch.whitelistOn })} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Users className="size-4" /> {ch.whitelistOn ? "白名单已启用" : "启用白名单"}</button></>}>
      <div className="mx-auto h-full max-w-3xl overflow-y-auto p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600"><MessageSquare className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[15px] text-slate-900">{ch.name}</span><span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${meta.cls}`}><MetaIcon className={`size-3.5 ${meta.spin ? "animate-spin" : ""}`} /> {meta.label}</span><span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${ch.hasAssociation ? "bg-cyan-50 text-cyan-700 ring-cyan-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{ch.hasAssociation ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}{ch.hasAssociation ? "有关联会话" : "无关联会话"}</span></div><div className="text-[12px] text-slate-400">{ch.type} · 群机器人</div></div></div>
          {(ch.connState === "failed" || ch.connState === "credExpired") && <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-[12px] text-rose-700 ring-1 ring-rose-200"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><div><div>{ch.lastError || (ch.connState === "credExpired" ? "凭证缺失、过期或被回收，请安全更新机器人密钥。" : "连接失败，请检查远端和网络配置。")}</div><button onClick={() => void reconnect()} disabled={reconnecting} className="mt-1.5 rounded-md bg-rose-600 px-2.5 py-1 text-[11.5px] text-white hover:bg-rose-700 disabled:opacity-50">{reconnecting ? "重新连接中…" : "重新连接"}</button></div></div>}
          {ch.connState === "missingConfig" && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-700 ring-1 ring-amber-200">配置或运行时尚未就绪，请打开机器人设置补全并保存。</div>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-1 text-[12px] font-medium text-slate-500">连接与同步</div><Field label="渠道类型">{ch.type}</Field><Field label="连接名称">{ch.name}</Field><Field label="远端群组标识"><span className="flex items-center gap-1.5 font-mono text-[12px]">{ch.remoteId || "—"}<button onClick={() => void copyRemote()} disabled={!ch.remoteId} aria-label="复制远端标识" className="grid size-6 place-items-center rounded hover:bg-slate-100 disabled:opacity-30"><Copy className="size-3.5 text-slate-400" /></button></span></Field><Field label="密钥 / Token"><span className="flex items-center gap-1.5 text-slate-400"><EyeOff className="size-3.5" /> {ch.credentialSet ? "已安全保存，不显示原文" : "尚未保存"}</span></Field><Field label="最近同步"><span className="flex items-center gap-2"><span>{ch.connState === "connected" ? ch.lastSync : "—"}</span><button onClick={() => void reconnect()} disabled={reconnecting} className="text-[11.5px] text-teal-600 hover:underline disabled:text-slate-300">{reconnecting ? "连接中…" : "重新连接"}</button></span></Field></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-1 text-[12px] font-medium text-slate-500">作用域与访问策略</div><Field label="连接作用域">{ch.projectId ? <button onClick={() => navigate("workbench")} className="text-teal-600 hover:underline">指定项目 · {projectName(projects, ch.projectId)}</button> : ch.workspaceRoot ? <span className="text-amber-600">项目不可用 · {ch.workspaceRoot}</span> : <span>全局</span>}</Field><Field label="访问策略"><span className="flex items-center gap-1.5">{ch.policy === "trusted" ? <><ShieldCheck className="size-3.5 text-emerald-500" /> 仅可信用户</> : <>所有人可用</>}</span></Field><Field label="白名单">{!ch.whitelistOn ? <span className="text-slate-400">未启用</span> : ch.userHit ? <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="size-3.5" /> 已启用 · 已配置成员</span> : <span className="flex items-center gap-1.5 text-amber-600"><Ban className="size-3.5" /> 已启用 · 尚无成员</span>}</Field><Field label="已配置">{ch.users.length} 位用户 · {ch.groups.length} 个群组</Field></div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><div className="mb-2 text-[12px] font-medium text-slate-500">关联的{brand.productName}会话</div>{ch.hasAssociation && linked.length > 0 ? <div className="space-y-2">{linked.map((session) => <div key={session.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><div className="min-w-0 flex-1"><div className="text-[13px] text-slate-800">{session.title}</div><div className="text-[11px] text-slate-400">{projectName(projects, session.projectId)} · {session.context.rounds} 轮 · {session.updatedAt}</div></div><button onClick={() => openSession(session.id)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><ExternalLink className="size-3.5" /> 打开会话</button></div>)}</div> : <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-[12px] text-slate-400">没有关联会话，暂不能打开会话{ch.connState === "connected" ? "（连接正常，但尚未产生会话）" : ""}</div>}</div>
      </div>
      {settingsOpen && <ChannelSettingsDialog channel={ch} onClose={() => setSettingsOpen(false)} />}
    </PageShell>
  );
}
