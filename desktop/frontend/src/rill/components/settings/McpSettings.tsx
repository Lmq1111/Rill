import { useMemo, useState } from "react";
import { Plus, Plug, Trash2, RefreshCw, Zap, KeyRound, Wrench, FileJson, ShieldCheck, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { Section, StateBadge, StateSwitcher, ConfirmDialog, Drawer, Toggle } from "./kit";
import { mcpServers as seed, plugins, type McpServer } from "./data";
import { useStore } from "../../state/visualStore";
import { useRillSettingsOptional } from "../../settings/runtime";

const demoTools: Record<string, { name: string; desc: string; readonly: boolean }[]> = {
  mcp1: [
    { name: "read_file", desc: "读取工作区文件内容", readonly: true },
    { name: "list_dir", desc: "列出目录", readonly: true },
    { name: "write_file", desc: "写入文件", readonly: false },
  ],
  mcp3: [
    { name: "run_lint", desc: "运行代码检查", readonly: true },
    { name: "gen_changelog", desc: "生成变更日志", readonly: false },
  ],
};

export function McpSettings() {
  const { navigate, params } = useStore();
  const live = useRillSettingsOptional();
  const [servers, setServers] = useState<McpServer[]>(seed);
  const [adding, setAdding] = useState(false);
  const [importMode, setImportMode] = useState<"form" | "json">("form");
  const [deleteTarget, setDeleteTarget] = useState<McpServer | null>(null);
  const [toolsOf, setToolsOf] = useState<McpServer | null>(null);
  const [connState, setConnState] = useState(() => initialVisualState(params.rillVisualState, ["connected", "connecting", "authExpired", "failed"] as const, "connected"));
  const [serverName, setServerName] = useState("");
  const [serverTransport, setServerTransport] = useState("stdio");
  const [serverTarget, setServerTarget] = useState("");
  const [serverArgs, setServerArgs] = useState("");
  const [serverAutoStart, setServerAutoStart] = useState(true);

  const liveServerViews = live?.snapshot?.servers;
  const shownServers = useMemo(() => liveServerViews ? liveServerViews.map((server): McpServer => ({
    id: server.name,
    name: server.name,
    origin: server.managedByPlugin ? "插件导入" : server.builtIn ? "内置" : "用户添加",
    pluginId: server.managedByPlugin,
    transport: server.transport === "http" ? "HTTP" : server.transport === "sse" ? "SSE" : server.transport === "streamable-http" ? "Streamable HTTP" : "stdio",
    enabled: server.status !== "disabled" && server.startIntent !== "off",
    state: server.status === "connected" ? "connected" : server.status === "initializing" ? "connecting" : server.status === "deferred" ? "onDemand" : server.status === "disabled" ? "disabled" : "failed",
    tools: server.tools ?? 0,
    lastError: server.error,
  })) : servers, [liveServerViews, servers]);

  const setState = (id: string, patch: Partial<McpServer>) => setServers((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const connect = async (s: McpServer) => {
    if (live) {
      const ok = await live.apply("重新连接 MCP Server", async () => {
        if (!live.backend.ReconnectMCPServer) throw new Error("当前桌面后端缺少 MCP 重连绑定");
        await live.backend.ReconnectMCPServer(s.name);
      });
      ok ? toast.success("已重新连接") : toast.error("连接失败", { description: live.error || "后端未确认连接" });
      return;
    }
    setState(s.id, { state: "connecting" });
    toast("正在连接…");
    setTimeout(() => {
      if (s.id === "mcp2") { setState(s.id, { state: "failed", lastError: "连接失败：握手超时" }); toast.error("连接失败"); }
      else { setState(s.id, { state: "connected", lastError: undefined }); toast.success("已连接"); }
    }, 1000);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.origin === "插件导入") { setDeleteTarget(null); navigate("settings", { tab: "plugin" }); toast("请在插件页面管理该来源", { description: `由插件 ${plugins.find(p=>p.id===deleteTarget.pluginId)?.name} 导入` }); return; }
    if (live) {
      const ok = await live.apply("删除 MCP Server", async () => {
        if (!live.backend.RemoveMCPServer) throw new Error("当前桌面后端缺少 MCP 删除绑定");
        await live.backend.RemoveMCPServer(deleteTarget.name);
      });
      if (!ok) { toast.error("删除失败", { description: live.error || "后端未确认删除" }); return; }
    } else setServers((ss) => ss.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("已删除 MCP Server");
  };

  return (
    <SettingsBody title="MCP 与工具" desc="管理可连接的 MCP Server、认证信息与已发现工具">
      {!live && <StateSwitcher value={connState} onChange={setConnState} options={[{ id: "connected", label: "已连接" }, { id: "connecting", label: "连接中" }, { id: "authExpired", label: "认证过期" }, { id: "failed", label: "连接失败" }]} />}
      {live?.error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{live.error}</div>}

      <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-500">
        <ShieldCheck className="size-4 text-emerald-500" /> 已启用签名 MCP 目录来源校验；区分内置、用户添加与插件导入的 Server。
      </div>

      <Section title="MCP Server" actions={
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" />新增 Server</button>
      }>
        {shownServers.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Plug className="size-7 text-slate-300" /><p className="mt-2">还没有配置 MCP Server</p></div>
        ) : (
          <div className="space-y-2">
            {shownServers.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] text-slate-900">{s.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{s.origin}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{s.transport}</span>
                  <StateBadge state={s.enabled ? s.state : "disabled"} />
                  <div className="ml-auto"><Toggle checked={s.enabled} onChange={(v) => {
                    if (live) {
                      void live.apply(v ? "启用 MCP Server" : "停用 MCP Server", async () => {
                        if (!live.backend.SetMCPServerEnabled) throw new Error("当前桌面后端缺少 MCP 启停绑定");
                        await live.backend.SetMCPServerEnabled(s.name, v);
                      }).then((ok) => ok ? toast(v ? "已启用" : "已停用") : toast.error("MCP 状态保存失败", { description: live.error }));
                    } else { setState(s.id, { enabled: v }); toast(v ? "已启用" : "已停用"); }
                  }} /></div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-400">
                  <span>工具数量：{s.tools}</span>
                  {s.origin === "插件导入" && <span className="flex items-center gap-1">来源插件：{plugins.find(p=>p.id===s.pluginId)?.name}</span>}
                </div>
                {s.lastError && <div className="mt-2 rounded-md bg-rose-50 px-2.5 py-1.5 text-[11.5px] text-rose-700">最近错误：{s.lastError}</div>}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                  <button onClick={() => void connect(s)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Zap className="size-3.5" />{s.state === "connected" ? "重连" : "连接"}</button>
                  <button onClick={() => void connect(s)} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RefreshCw className="size-3.5" />刷新工具</button>
                  <button onClick={() => setToolsOf(s)} disabled={s.tools === 0} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><Wrench className="size-3.5" />查看工具</button>
                  {s.state === "authExpired" && <button onClick={() => { setState(s.id, { state: "connected", lastError: undefined }); toast.success("已重新认证"); }} className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11.5px] text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"><KeyRound className="size-3.5" />重新认证</button>}
                  <button onClick={() => {
                    if (!live) { toast("已清除认证信息"); return; }
                    void live.apply("清除 MCP 认证", async () => {
                      if (!live.backend.ClearMCPServerAuthentication) throw new Error("当前桌面后端缺少 MCP 认证清理绑定");
                      await live.backend.ClearMCPServerAuthentication(s.name);
                    }).then((ok) => ok ? toast.success("已清除认证信息") : toast.error("认证清理失败", { description: live.error }));
                  }} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Lock className="size-3.5" />清除认证</button>
                  <button onClick={() => setDeleteTarget(s)} className="ml-auto grid size-7 place-items-center rounded-lg text-rose-500 ring-1 ring-slate-200 hover:bg-rose-50"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {adding && (
        <Drawer title="新增 MCP Server" onClose={() => setAdding(false)} footer={
          <>
            <button onClick={() => setAdding(false)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
            {!live && <button onClick={() => toast("配置校验中…", { description: "未通过校验的 Server 不允许连接" })} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50">校验配置</button>}
            <button onClick={() => {
              if (live) {
                void live.apply("新增 MCP Server", async () => {
                  if (!live.backend.AddMCPServer) throw new Error("当前桌面后端缺少 MCP 新增绑定");
                  if (!serverName.trim() || !serverTarget.trim()) throw new Error("名称与命令 / URL 不能为空");
                  await live.backend.AddMCPServer({ name: serverName.trim(), transport: serverTransport === "HTTP" ? "http" : serverTransport === "SSE" ? "sse" : serverTransport === "Streamable HTTP" ? "streamable-http" : "stdio", command: serverTransport === "stdio" ? serverTarget.trim() : "", args: serverArgs.split(/\s+/).filter(Boolean), url: serverTransport === "stdio" ? "" : serverTarget.trim(), autoStart: serverAutoStart });
                }).then((ok) => { if (ok) { setAdding(false); setServerName(""); setServerTarget(""); setServerArgs(""); setServerAutoStart(true); toast.success("已保存并连接"); } else toast.error("MCP Server 保存失败", { description: live.error }); });
              } else { setServers((ss) => [...ss, { id: `mcp${Date.now()}`, name: "新 Server", origin: "用户添加", transport: "stdio", enabled: true, state: "connected", tools: 0 }]); setAdding(false); toast.success("已保存并连接"); }
            }} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">保存变更</button>
          </>
        }>
          {!live && <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[12px]">
            <button onClick={() => setImportMode("form")} className={`flex-1 rounded px-2 py-1.5 ${importMode === "form" ? "bg-white shadow-sm" : "text-slate-500"}`}>表单配置</button>
            <button onClick={() => setImportMode("json")} className={`flex-1 rounded px-2 py-1.5 ${importMode === "json" ? "bg-white shadow-sm" : "text-slate-500"}`}><FileJson className="mr-1 inline size-3.5" />JSON 导入</button>
          </div>}
          {live || importMode === "form" ? (
            <>
              <label className="block"><span className="text-[12px] text-slate-500">名称</span><input value={serverName} onChange={(event) => setServerName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" /></label>
              <label className="block"><span className="text-[12px] text-slate-500">传输方式</span><select value={serverTransport} onChange={(event) => setServerTransport(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option>stdio</option><option>HTTP</option><option>Streamable HTTP</option><option>SSE</option></select></label>
              <label className="block"><span className="text-[12px] text-slate-500">命令 / URL</span><input value={serverTarget} onChange={(event) => setServerTarget(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="npx server / https://…" /></label>
              <label className="block"><span className="text-[12px] text-slate-500">参数 / 请求头</span><input value={serverArgs} onChange={(event) => setServerArgs(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
              {!live && <label className="block"><span className="text-[12px] text-slate-500">工作目录 / 认证信息</span><input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="敏感请求头不显示原文" /></label>}
              <label className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5"><span className="text-[13px] text-slate-800">自动连接</span><Toggle checked={serverAutoStart} onChange={setServerAutoStart} /></label>
            </>
          ) : (
            <>
              <textarea rows={8} defaultValue={'{\n  "name": "my-mcp",\n  "transport": "stdio",\n  "command": "npx",\n  "args": ["my-mcp-server"]\n}'} className="w-full resize-none rounded-lg border border-slate-200 p-3 font-mono text-[12px] outline-none focus:border-teal-300" />
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-[12px] text-teal-800">
                <div className="font-medium">保存前变更预览</div>
                <ul className="mt-1 list-disc pl-4 text-teal-700"><li>新增 Server：my-mcp（stdio）</li><li>默认自动连接：是</li></ul>
              </div>
            </>
          )}
        </Drawer>
      )}

      {toolsOf && (
        <Drawer title={`${toolsOf.name} · 暴露的工具`} onClose={() => setToolsOf(null)}>
          {(live ? (live.snapshot?.servers.find((server) => server.name === toolsOf.name)?.toolList ?? []).map((tool) => ({ name: tool.name, desc: tool.description, readonly: Boolean(tool.readOnlyHint) })) : (demoTools[toolsOf.id] ?? [])).map((t) => (
            <div key={t.name} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2"><span className="font-mono text-[12.5px] text-slate-800">{t.name}</span>{t.readonly && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] text-emerald-700 ring-1 ring-emerald-200">只读</span>}</div>
              <p className="mt-1 text-[12px] text-slate-500">{t.desc}</p>
            </div>
          ))}
        </Drawer>
      )}

      <ConfirmDialog open={!!deleteTarget} title={deleteTarget?.origin === "插件导入" ? "该 Server 由插件导入" : "删除 MCP Server"} tone={deleteTarget?.origin === "插件导入" ? "amber" : "rose"} confirmText={deleteTarget?.origin === "插件导入" ? "前往插件页面" : "删除"} onConfirm={() => void doDelete()} onCancel={() => setDeleteTarget(null)}>
        {deleteTarget?.origin === "插件导入" ? (
          <span className="inline-flex items-center gap-1">该 Server 由插件提供，请在插件页面管理其来源。<ExternalLink className="size-3.5" /></span>
        ) : "删除后将移除该 Server 的连接与认证配置。确认删除？"}
      </ConfirmDialog>
    </SettingsBody>
  );
}
