import { useMemo, useState } from "react";
import { Package, Plus, RefreshCw, Trash2, ShieldAlert, Sparkles, Users, Terminal, Plug, Webhook, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { Section, Toggle, StateSwitcher, ConfirmDialog, Drawer } from "./kit";
import { plugins as seed, type Plugin } from "./data";
import { useStore } from "../../state/visualStore";
import { useRillSettingsOptional } from "../../settings/runtime";

const compatLabel: Record<Plugin["compat"], { text: string; cls: string }> = {
  ok: { text: "兼容", cls: "bg-emerald-50 text-emerald-700" },
  partial: { text: "部分兼容", cls: "bg-amber-50 text-amber-700" },
  incompatible: { text: "不兼容", cls: "bg-rose-50 text-rose-700" },
};

export function PluginSettings() {
  const { navigate, params } = useStore();
  const live = useRillSettingsOptional();
  const [items, setItems] = useState<Plugin[]>(seed);
  const [detail, setDetail] = useState<Plugin | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [permitId, setPermitId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pstate, setPState] = useState(() => initialVisualState(params.rillVisualState, ["normal", "installing", "empty"] as const, "normal"));
  const [source, setSource] = useState("");

  const livePlugins = live?.snapshot?.plugins;
  const authoritativeItems = useMemo(() => livePlugins ? livePlugins.map((plugin): Plugin => ({
    id: plugin.name,
    name: plugin.name,
    version: plugin.version || "dev",
    source: plugin.source || plugin.root,
    enabled: plugin.enabled,
    compat: plugin.compatibility === "none" ? "incompatible" : plugin.compatibility === "partial" ? "partial" : "ok",
    issues: (plugin.skippedCapabilities?.length ?? 0) + (plugin.warnings?.length ?? 0) + (plugin.error ? 1 : 0),
    provides: { skills: plugin.skills ?? 0, agents: plugin.agents ?? 0, commands: plugin.commands ?? 0, hooks: plugin.hooks ?? 0, mcp: plugin.mcpServers ?? 0 },
    invoke: plugin.name,
  })) : items, [items, livePlugins]);
  const list = !live && pstate === "empty" ? [] : authoritativeItems;

  const toggle = (p: Plugin, v: boolean) => {
    if (v && p.compat === "incompatible") return toast.error("不兼容的插件无法启用");
    if (v) return setPermitId(p.id); // 启用前需确认权限
    if (live) {
      void live.apply("停用插件", async () => { if (!live.backend.SetPluginEnabled) throw new Error("当前桌面后端缺少插件启停绑定"); await live.backend.SetPluginEnabled(p.name, false); }).then((ok) => ok ? toast("已停用插件", { description: "其提供的技能 / 子智能体 / 工具将同时不可用" }) : toast.error("插件停用失败", { description: live.error }));
      return;
    }
    setItems((is) => is.map((x) => x.id === p.id ? { ...x, enabled: false } : x));
    toast("已停用插件", { description: "其提供的技能 / 子智能体 / 工具将同时不可用" });
  };

  return (
    <SettingsBody title="插件" desc="管理插件及其提供的技能、子智能体、命令、钩子与 MCP 工具">
      {!live && <StateSwitcher value={pstate} onChange={setPState} options={[{ id: "normal", label: "正常" }, { id: "installing", label: "安装中" }, { id: "empty", label: "无插件" }]} />}
      {live?.error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{live.error}</div>}

      <Section title="已安装插件" desc="仅支持来自 Git 或本地目录的插件，不涉及公开插件市场" actions={
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" />添加插件</button>
      }>
        {!live && pstate === "installing" ? (
          <div className="grid place-items-center py-10 text-slate-400"><RefreshCw className="size-6 animate-spin" /><span className="mt-2 text-[13px]">安装中…</span></div>
        ) : list.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Package className="size-7 text-slate-300" /><p className="mt-2">还没有安装任何插件</p></div>
        ) : (
          <div className="space-y-2">
            {list.map((p) => {
              const c = compatLabel[p.compat];
              return (
                <div key={p.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] text-slate-900">{p.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">v{p.version}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${c.cls}`}>{c.text}</span>
                    {p.issues > 0 && <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] bg-amber-50 text-amber-700"><ShieldAlert className="size-3" />{p.issues} 个问题</span>}
                    <Toggle checked={p.enabled} onChange={(v) => toggle(p, v)} />
                  </div>
                  <div className="mt-1 font-mono text-[11.5px] text-slate-400">{p.source}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-slate-500">
                    <span className="flex items-center gap-1"><Sparkles className="size-3.5 text-teal-500" />{p.provides.skills} 技能</span>
                    <span className="flex items-center gap-1"><Users className="size-3.5 text-violet-500" />{p.provides.agents} 子智能体</span>
                    <span className="flex items-center gap-1"><Terminal className="size-3.5 text-slate-400" />{p.provides.commands} 命令</span>
                    <span className="flex items-center gap-1"><Webhook className="size-3.5 text-slate-400" />{p.provides.hooks} 钩子</span>
                    <span className="flex items-center gap-1"><Plug className="size-3.5 text-sky-500" />{p.provides.mcp} MCP</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                    <button onClick={() => setDetail(p)} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">详情与权限</button>
                    <button onClick={() => {
                      if (live) void live.apply("更新插件", async () => { if (!live.backend.UpdatePlugin) throw new Error("当前桌面后端缺少插件更新绑定"); await live.backend.UpdatePlugin(p.name); }).then((ok) => ok ? toast.success("插件已更新") : toast.error("插件更新失败", { description: live.error }));
                      else { setPState("installing"); toast("检查更新中…"); setTimeout(() => setPState("normal"), 900); }
                    }} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RefreshCw className="size-3.5" />检查更新</button>
                    <button onClick={() => setDeleteId(p.id)} className="ml-auto flex items-center gap-1 text-[11.5px] text-rose-600 hover:underline"><Trash2 className="size-3.5" />卸载</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {detail && (
        <Drawer title={detail.name} onClose={() => setDetail(null)}>
          <div className="flex items-center gap-1.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">v{detail.version}</span><span className={`rounded px-1.5 py-0.5 text-[11px] ${compatLabel[detail.compat].cls}`}>{compatLabel[detail.compat].text}</span></div>
          <div className="font-mono text-[11.5px] text-slate-400">{detail.source}</div>
          <div className="rounded-lg bg-amber-50 p-3 text-[12px] text-amber-800"><div className="flex items-center gap-1.5"><ShieldAlert className="size-4" />该插件申请的权限</div><ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-amber-700"><li>读取与写入工作区文件</li><li>注册 MCP 工具并对外发起连接</li><li>注入命令与钩子到会话流程</li></ul><p className="mt-1.5 text-[11px]">启用插件即授予以上权限，请仅安装可信来源的插件。</p></div>
          <div className="space-y-1.5">
            <p className="text-[12px] text-slate-500">该插件提供的能力</p>
            {[
              { icon: Sparkles, label: `${detail.provides.skills} 个技能`, tab: "skill" as const },
              { icon: Users, label: `${detail.provides.agents} 个子智能体`, tab: "subagent" as const },
              { icon: Plug, label: `${detail.provides.mcp} 个 MCP 工具`, tab: "mcp" as const },
            ].map((r) => (
              <button key={r.label} onClick={() => navigate("settings", { tab: r.tab })} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50"><r.icon className="size-4 text-slate-400" />{r.label}<ChevronRight className="ml-auto size-4 text-slate-300" /></button>
            ))}
          </div>
        </Drawer>
      )}

      {adding && (
        <Drawer title="添加插件" onClose={() => setAdding(false)} footer={
          <>
            <button onClick={() => setAdding(false)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
            <button onClick={() => {
              if (live) void live.apply("安装插件", async () => { if (!live.backend.InstallPlugin) throw new Error("当前桌面后端缺少插件安装绑定"); if (!source.trim()) throw new Error("插件地址或路径不能为空"); await live.backend.InstallPlugin(source.trim(), { link: source.trim().startsWith("/") || source.trim().startsWith("~") }); }).then((ok) => { if (ok) { setAdding(false); setSource(""); toast.success("插件已安装（默认停用）"); } else toast.error("插件安装失败", { description: live.error }); });
              else { setAdding(false); setPState("installing"); toast("安装中…"); setTimeout(() => { setItems((is) => [...is, { id: `pl${Date.now()}`, name: "new-plugin", version: "0.1.0", source: "git: github.com/example/new-plugin", enabled: false, compat: "ok", issues: 0, provides: { skills: 0, agents: 0, commands: 0, hooks: 0, mcp: 0 }, invoke: "new-plugin" }]); setPState("normal"); toast.success("插件已安装（默认停用）"); }, 1000); }
            }} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">安装</button>
          </>
        }>
          <label className="block"><span className="text-[12px] text-slate-500">来源类型</span><select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option>Git 仓库</option><option>本地目录</option></select></label>
          <label className="block"><span className="text-[12px] text-slate-500">地址 / 路径</span><input value={source} onChange={(event) => setSource(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="github.com/… 或 ~/plugins/…" /></label>
          <div className="rounded-lg bg-slate-50 p-2.5 text-[11.5px] text-slate-500">安装后插件默认为停用状态，需在列表中手动确认权限后启用。</div>
        </Drawer>
      )}

      <ConfirmDialog open={!!permitId} title="启用插件并授予权限" tone="amber" confirmText="授予并启用" onConfirm={() => {
        if (live && permitId) void live.apply("启用插件", async () => { if (!live.backend.SetPluginEnabled) throw new Error("当前桌面后端缺少插件启停绑定"); await live.backend.SetPluginEnabled(permitId, true); }).then((ok) => { if (ok) { setPermitId(null); toast.success("插件已启用"); } else toast.error("插件启用失败", { description: live.error }); });
        else { setItems((is) => is.map((x) => x.id === permitId ? { ...x, enabled: true } : x)); setPermitId(null); toast.success("插件已启用"); }
      }} onCancel={() => setPermitId(null)}>
        启用后，该插件将获得文件读写、注册 MCP 工具及注入命令/钩子的权限。请确认来源可信。
      </ConfirmDialog>

      <ConfirmDialog open={!!deleteId} title="卸载插件" confirmText="卸载" onConfirm={() => {
        if (live && deleteId) void live.apply("卸载插件", async () => { if (!live.backend.RemovePlugin) throw new Error("当前桌面后端缺少插件卸载绑定"); await live.backend.RemovePlugin(deleteId); }).then((ok) => { if (ok) { setDeleteId(null); toast.success("已卸载", { description: "其提供的技能、子智能体与 MCP 工具已一并移除" }); } else toast.error("插件卸载失败", { description: live.error }); });
        else { setItems((is) => is.filter((x) => x.id !== deleteId)); setDeleteId(null); toast.success("已卸载", { description: "其提供的技能、子智能体与 MCP 工具已一并移除" }); }
      }} onCancel={() => setDeleteId(null)}>
        卸载后，该插件提供的全部技能、子智能体、命令、钩子与 MCP 工具都会被移除。确认卸载？
      </ConfirmDialog>
    </SettingsBody>
  );
}
