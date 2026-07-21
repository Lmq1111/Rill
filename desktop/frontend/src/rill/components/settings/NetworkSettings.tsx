import { useEffect, useState } from "react";
import { RotateCcw, AlertTriangle, Wifi } from "lucide-react";
import { toast } from "sonner";
import { SettingsBody } from "./Settings";
import { Section, Row, Select, SaveBar } from "./kit";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";
import { useRillSettingsOptional } from "../../settings/runtime";

type ProxyMode = "跟随系统" | "关闭代理" | "手动配置";
type Test = "idle" | "testing" | "ok" | "failed";

export function NetworkSettings() {
  const { params } = useStore();
  const live = useRillSettingsOptional();
  const persisted = live?.snapshot?.settings.network;
  const visualMode: Record<string, ProxyMode> = { system: "跟随系统", direct: "关闭代理", manual: "手动配置" };
  const [mode, setMode] = useState<ProxyMode>(() => visualMode[params.rillVisualState] ?? "跟随系统");
  const [proto, setProto] = useState("HTTPS");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("7890");
  const [user, setUser] = useState("");
  const [hasPassword, setHasPassword] = useState(true);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [editingPassword, setEditingPassword] = useState(false);
  const [noProxy, setNoProxy] = useState("localhost, 127.0.0.1, *.internal");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [target, setTarget] = useState(`${brand.productName}官方预设（模型服务）`);
  const [test, setTest] = useState<Test>("idle");
  const [stage, setStage] = useState("");

  const manual = mode === "手动配置";
  const d = () => setDirty(true);

  const incomplete = manual && (!host.trim() || !port.trim());

  useEffect(() => {
    if (!persisted) return;
    setMode(persisted.proxyMode === "custom" ? "手动配置" : persisted.proxyMode === "off" ? "关闭代理" : "跟随系统");
    setProto((persisted.proxy.type || "http").toUpperCase());
    setHost(persisted.proxy.server || "");
    setPort(persisted.proxy.port ? String(persisted.proxy.port) : "");
    setUser(persisted.proxy.username || "");
    setHasPassword(Boolean(persisted.proxy.passwordSet));
    setPasswordDraft("");
    setEditingPassword(false);
    setNoProxy(persisted.noProxy || "");
    setDirty(false);
  }, [persisted]);

  const runTest = async (result: Test) => {
    if (live) {
      setTest("testing"); setStage("建立连接…");
      try {
        if (target.includes("GitHub")) {
          if (!live.backend.CheckUpdate) throw new Error("更新检查绑定不可用");
          const info = await live.backend.CheckUpdate();
          if (!info) throw new Error("GitHub Releases 检查未返回结果");
          if (info.err) throw new Error(info.err);
        } else if (target.includes("MCP")) {
          const server = live.snapshot?.servers[0];
          if (!server || !live.backend.ReconnectMCPServer) throw new Error("没有可测试的 MCP Server");
          await live.backend.ReconnectMCPServer(server.name);
        } else {
          const provider = live.snapshot?.settings.providers.find((item) => item.added) ?? live.snapshot?.settings.providers[0];
          if (!provider || !live.backend.FetchProviderModels) throw new Error("没有可测试的模型服务");
          await live.backend.FetchProviderModels(provider);
        }
        setTest("ok"); setStage("连接成功");
      } catch (error) {
        setTest("failed"); setStage(error instanceof Error ? error.message : "连接失败");
      }
      return;
    }
    setTest("testing"); setStage("解析地址…");
    setTimeout(() => setStage("建立连接…"), 400);
    setTimeout(() => { setTest(result); setStage(result === "ok" ? "连接成功" : "连接失败"); }, 1100);
  };

  const save = async () => {
    if (incomplete) return toast.error("配置不完整", { description: "请填写代理服务器与端口" });
    if (manual && !/^\d+$/.test(port)) return toast.error("端口无效");
    if (live) {
      const ok = await live.apply("保存网络设置", async () => {
        if (!live.backend.SetNetwork) throw new Error("当前桌面后端缺少网络设置绑定");
        await live.backend.SetNetwork({
          proxyMode: mode === "手动配置" ? "custom" : mode === "关闭代理" ? "off" : "auto",
          proxyUrl: persisted?.proxyUrl ?? "",
          noProxy,
          proxy: {
            type: proto.toLowerCase(), server: host.trim(), port: Number(port || 0), username: user.trim(),
            password: passwordDraft,
            passwordSet: hasPassword,
          },
        });
      });
      if (ok) { setDirty(false); setPasswordDraft(""); setEditingPassword(false); toast.success("网络设置已保存", { description: "代理密码不会回传到界面或诊断" }); }
      else toast.error("网络设置保存失败", { description: live.error || "后端未确认保存" });
      return;
    }
    setSaving(true); setTimeout(() => { setSaving(false); setDirty(false); toast.success("网络设置已保存", { description: "连接测试结果与配置不会发送给上游服务" }); }, 700);
  };

  return (
    <SettingsBody title="网络" desc="管理访问模型服务、MCP Server 与 GitHub Releases 的网络与代理配置，并验证连接可用性">
      {!live && <StateSwitcherLocal mode={mode} onMode={(m) => { setMode(m); d(); }} />}
      {live?.error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{live.error}</div>}

      <Section title="代理模式">
        <Row label="代理来源" hint={mode === "跟随系统" ? "使用操作系统当前的代理设置" : mode === "关闭代理" ? "所有请求直连，不使用代理" : "使用下方手动配置的代理"}>
          <Select value={mode} onChange={(v) => { setMode(v as ProxyMode); d(); }} options={["跟随系统", "关闭代理", "手动配置"]} />
        </Row>
      </Section>

      {manual && (
        <div className="mt-4">
          <Section title="手动代理配置">
            <div className="grid grid-cols-3 gap-3">
              <label className="block"><span className="text-[12px] text-slate-500">协议</span><Select value={proto} onChange={(v) => { setProto(v); d(); }} options={["HTTP", "HTTPS", "SOCKS5"]} /></label>
              <label className="col-span-2 block"><span className="text-[12px] text-slate-500">代理服务器</span><input value={host} onChange={(e) => { setHost(e.target.value); d(); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <label className="block"><span className="text-[12px] text-slate-500">端口</span><input value={port} onChange={(e) => { setPort(e.target.value); d(); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
              <label className="col-span-2 block"><span className="text-[12px] text-slate-500">用户名（可选）</span><input value={user} onChange={(e) => { setUser(e.target.value); d(); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" /></label>
            </div>
            {/* 密码：隐藏原文 */}
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between"><span className="text-[12px] text-slate-500">代理密码</span><span className="text-[11px] text-slate-400">不显示原文，也不写入诊断</span></div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 rounded-md bg-white px-3 py-1.5 font-mono text-[12px] text-slate-400 ring-1 ring-slate-200">{hasPassword ? "•••••••••• 已保存" : "未配置"}</div>
                <button onClick={() => { setEditingPassword(true); d(); }} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{hasPassword ? "替换" : "设置"}</button>
                {hasPassword && <button onClick={() => { setHasPassword(false); setPasswordDraft(""); setEditingPassword(false); d(); }} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">清除</button>}
              </div>
              {editingPassword && <input aria-label="新代理密码" type="password" value={passwordDraft} onChange={(event) => { setPasswordDraft(event.target.value); setHasPassword(Boolean(event.target.value)); d(); }} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-teal-300" placeholder="输入新密码；保存后不会回显" />}
            </div>
            <label className="mt-3 block"><span className="text-[12px] text-slate-500">无需代理的地址（逗号分隔）</span><input value={noProxy} onChange={(e) => { setNoProxy(e.target.value); d(); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
            {incomplete && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-700"><AlertTriangle className="size-4" />配置不完整：请填写服务器与端口。</div>}
          </Section>
        </div>
      )}

      <div className="mt-4">
        <Section title="当前生效配置" desc="不同请求可能采用不同的代理来源">
          {[
            { k: "模型服务请求", v: mode === "手动配置" ? `${proto} ${host}:${port}` : mode },
            { k: "MCP Server 请求", v: mode === "手动配置" ? `${proto} ${host}:${port}` : mode },
            { k: "GitHub Releases", v: mode === "关闭代理" ? "直连" : mode === "手动配置" ? `${proto} ${host}:${port}` : "跟随系统" },
          ].map((r) => <Row key={r.k} label={r.k}><span className="font-mono text-[12px] text-slate-600">{r.v}</span></Row>)}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="连接测试" desc="仅验证所选目标，不代表所有服务均可访问；测试结果不会发送给上游服务">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block flex-1"><span className="text-[12px] text-slate-500">测试目标</span>
              <Select value={target} onChange={setTarget} options={[`${brand.productName}官方预设（模型服务）`, "本地 vLLM（模型服务）", "postgres-mcp（MCP Server）", "GitHub Releases"]} />
            </label>
            <button onClick={() => void runTest("ok")} className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-[12px] text-white hover:bg-teal-700"><Wifi className="size-4" />测试连接</button>
            {!live && <Select value="模拟成功" onChange={(v) => void runTest(v === "模拟成功" ? "ok" : "failed")} options={["模拟成功", "模拟失败"]} />}
          </div>
          {test !== "idle" && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] ${test === "ok" ? "bg-emerald-50 text-emerald-700" : test === "failed" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}>
              <div>目标：{target}</div>
              <div className="mt-0.5">{test === "testing" ? `进行中 · ${stage}` : test === "ok" ? "连接成功 · 耗时 342ms" : "连接失败 · 耗时 5.0s"}</div>
              {test === "failed" && <div className="mt-0.5 opacity-90">失败原因：通过代理连接超时，请检查代理服务器与端口，或目标是否可达。</div>}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-4">
        <button onClick={() => { setMode("跟随系统"); setDirty(true); toast.success("已恢复为跟随系统设置"); }} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw className="size-4" />恢复系统设置</button>
      </div>

      <SaveBar dirty={dirty} saving={live?.saving ?? saving} onSave={() => void save()} onReset={() => { if (persisted) void live?.reload(); setDirty(false); setPasswordDraft(""); setEditingPassword(false); toast("已放弃修改"); }} />
    </SettingsBody>
  );
}

function StateSwitcherLocal({ mode, onMode }: { mode: string; onMode: (m: ProxyMode) => void }) {
  const opts: ProxyMode[] = ["跟随系统", "关闭代理", "手动配置"];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] text-slate-400">演示状态：</span>
      {opts.map((o) => <button key={o} aria-pressed={mode === o} onClick={() => onMode(o)} className={`rounded-full px-2.5 py-1 text-[11.5px] ${mode === o ? "bg-teal-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{o}</button>)}
    </div>
  );
}
