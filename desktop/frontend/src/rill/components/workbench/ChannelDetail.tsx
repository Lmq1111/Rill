import {
  MessageSquare, Copy, ExternalLink, Settings2, ShieldCheck, Users, AlertTriangle,
  CheckCircle2, Loader2, Ban, EyeOff, Link2, Link2Off,
} from "lucide-react";
import { toast } from "sonner";
import { brand } from "../../../lib/brand";
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

export function ChannelDetail() {
  const { params, channels, sessions, projects, navigate, openSession, updateChannel } = useStore();
  const ch = channels.find((c) => c.id === params.id) ?? channels[0];
  if (!ch) return <PageShell icon={MessageSquare} title="消息渠道详情"><div className="grid h-full place-items-center text-[13px] text-slate-400">未找到渠道</div></PageShell>;

  const meta = connMeta[ch.connState];
  const MetaIcon = meta.icon;
  const linked = sessions.filter((s) => ch.sessionIds.includes(s.id));

  return (
    <PageShell icon={MessageSquare} title="消息渠道详情" subtitle={`${ch.type} · ${ch.name}`}
      actions={
        <>
          <button onClick={() => toast("机器人设置", { description: "打开渠道设置" })} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Settings2 className="size-4" /> 机器人设置</button>
          <button onClick={() => updateChannel(ch.id, { whitelistOn: !ch.whitelistOn })} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Users className="size-4" /> {ch.whitelistOn ? "白名单已启用" : "启用白名单"}</button>
        </>
      }>
      <div className="mx-auto h-full max-w-3xl overflow-y-auto p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600"><MessageSquare className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] text-slate-900">{ch.name}</span>
                {/* 连接状态与关联会话是两个独立状态 */}
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${meta.cls}`}><MetaIcon className={`size-3.5 ${meta.spin ? "animate-spin" : ""}`} /> {meta.label}</span>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${ch.hasAssociation ? "bg-cyan-50 text-cyan-700 ring-cyan-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{ch.hasAssociation ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}{ch.hasAssociation ? "有关联会话" : "无关联会话"}</span>
              </div>
              <div className="text-[12px] text-slate-400">{ch.type} · 群机器人</div>
            </div>
          </div>

          {(ch.connState === "failed" || ch.connState === "credExpired") && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-[12px] text-rose-700 ring-1 ring-rose-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <div>{ch.connState === "credExpired" ? "凭证已过期或被回收 (401)，请更新机器人密钥。" : "连接失败：远端不可达或握手失败。"}</div>
                <button onClick={() => { updateChannel(ch.id, { connState: "connected", lastSync: "刚刚" }); toast.success("已重新连接"); }} className="mt-1.5 rounded-md bg-rose-600 px-2.5 py-1 text-[11.5px] text-white hover:bg-rose-700">重新连接</button>
              </div>
            </div>
          )}
          {ch.connState === "missingConfig" && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-700 ring-1 ring-amber-200">未完成配置：缺少「事件订阅回调地址」，请前往机器人设置补全。</div>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 text-[12px] font-medium text-slate-500">连接与同步</div>
            <Field label="渠道类型">{ch.type}</Field>
            <Field label="连接名称">{ch.name}</Field>
            <Field label="远端群组标识"><span className="flex items-center gap-1.5 font-mono text-[12px]">{ch.remoteId}<button onClick={() => toast.success("已复制远端标识")} className="grid size-6 place-items-center rounded hover:bg-slate-100"><Copy className="size-3.5 text-slate-400" /></button></span></Field>
            <Field label="密钥 / Token"><span className="flex items-center gap-1.5 text-slate-400"><EyeOff className="size-3.5" /> 已隐藏，不显示原文</span></Field>
            <Field label="最近同步">{ch.connState === "connected" ? ch.lastSync : "—"}</Field>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 text-[12px] font-medium text-slate-500">作用域与访问策略</div>
            <Field label="连接作用域">{ch.projectId ? <button onClick={() => navigate("workbench")} className="text-teal-600 hover:underline">指定项目 · {projectName(projects, ch.projectId)}</button> : <span>全局</span>}</Field>
            <Field label="访问策略"><span className="flex items-center gap-1.5">{ch.policy === "trusted" ? <><ShieldCheck className="size-3.5 text-emerald-500" /> 仅可信用户</> : <>所有人可用</>}</span></Field>
            <Field label="白名单">
              {!ch.whitelistOn ? <span className="text-slate-400">未启用</span>
                : ch.userHit ? <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="size-3.5" /> 已启用 · 当前用户命中</span>
                : <span className="flex items-center gap-1.5 text-amber-600"><Ban className="size-3.5" /> 已启用 · 当前用户未命中</span>}
            </Field>
            <Field label="已配置">{ch.users.length} 位用户 · {ch.groups.length} 个群组</Field>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-[12px] font-medium text-slate-500">关联的{brand.productName}会话</div>
          {ch.hasAssociation && linked.length > 0 ? (
            <div className="space-y-2">
              {linked.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="min-w-0 flex-1"><div className="text-[13px] text-slate-800">{s.title}</div><div className="text-[11px] text-slate-400">{projectName(projects, s.projectId)} · {s.context.rounds} 轮 · {s.updatedAt}</div></div>
                  <button onClick={() => openSession(s.id)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><ExternalLink className="size-3.5" /> 打开会话</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-[12px] text-slate-400">没有关联会话，暂不能打开会话{ch.connState === "connected" ? "（连接正常，但尚未产生会话）" : ""}</div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
