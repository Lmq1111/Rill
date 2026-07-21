import { useMemo, useState } from "react";
import { Search, Sparkles, FolderPlus, RefreshCw, FolderX, ExternalLink, Info, Check, X } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { Section, Toggle, StateBadge, StateSwitcher, ConfirmDialog, Drawer } from "./kit";
import { skills as seed, plugins, type Skill } from "./data";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";
import { useRillSettingsOptional } from "../../settings/runtime";

const originLabel: Record<Skill["origin"], string> = { 内置: `${brand.productName}内置`, 用户: "用户技能", 项目: "项目技能", 插件: "插件提供" };

export function SkillSettings() {
  const { navigate, params } = useStore();
  const live = useRillSettingsOptional();
  const [skills, setSkills] = useState<Skill[]>(seed);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Skill | null>(null);
  const [removeDir, setRemoveDir] = useState<string | null>(null);
  const [pstate, setPState] = useState(() => initialVisualState(params.rillVisualState, ["normal", "scanning", "empty"] as const, "normal"));
  const [dirs, setDirs] = useState([
    { path: "~/.rillagent/skills", exists: true, count: 1 },
    { path: "~/work/rill/rill-web/.rillagent/skills", exists: true, count: 1 },
    { path: "~/old/skills", exists: false, count: 0 },
  ]);
  const [showSuggest, setShowSuggest] = useState(true);

  const shownSkills = useMemo(() => live?.snapshot ? live.snapshot.skills.skills.map((skill): Skill => ({
    id: `${skill.scope}:${skill.name}`,
    name: skill.name,
    invoke: skill.invocation || `/${skill.name}`,
    desc: skill.description || "未提供说明",
    origin: skill.plugin ? "插件" : skill.scope === "builtin" ? "内置" : skill.scope === "project" ? "项目" : "用户",
    pluginId: skill.plugin,
    enabled: skill.enabled,
    health: "ok",
  })) : skills, [live?.snapshot, skills]);
  const shownDirs = live?.snapshot ? live.snapshot.skills.skillRoots.map((root) => ({ path: root.dir, exists: root.status !== "missing" && root.status !== "error", count: root.skills, removable: root.removable })) : dirs.map((dir) => ({ ...dir, removable: true }));
  const list = shownSkills.filter((s) => !query || s.name.includes(query) || s.desc.includes(query) || originLabel[s.origin].includes(query));

  return (
    <SettingsBody title="技能" desc={`浏览、启用和管理${brand.productName}的 Skills，理解每个技能的用途、来源与可用状态`}>
      {!live && <StateSwitcher value={pstate} onChange={setPState} options={[{ id: "normal", label: "正常" }, { id: "scanning", label: "扫描中" }, { id: "empty", label: "无技能" }]} />}
      {live?.error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{live.error}</div>}

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200 focus-within:ring-teal-300">
        <Search className="size-4 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按名称、描述或来源搜索技能" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
      </div>

      {!live && showSuggest && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
          <div className="flex items-center gap-2 text-[12.5px] text-sky-800"><Info className="size-4" />系统建议的技能来源</div>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-white p-2.5">
            <span className="font-mono text-[12px] text-slate-600">~/work/rill/rill-web/tools/skills</span>
            <div className="flex gap-1.5">
              <button onClick={() => { setDirs((d) => [...d, { path: "~/work/rill/rill-web/tools/skills", exists: true, count: 2 }]); toast.success("已接受建议来源"); }} className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-[11.5px] text-white hover:bg-teal-700"><Check className="size-3.5" />接受</button>
              <button onClick={() => toast("已忽略该建议")} className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">忽略</button>
              <button onClick={() => setShowSuggest(false)} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-3.5" /></button>
            </div>
          </div>
        </div>
      )}

      <Section title="技能列表">
        {!live && pstate === "scanning" ? (
          <div className="grid place-items-center py-10 text-slate-400"><RefreshCw className="size-6 animate-spin" /><span className="mt-2 text-[13px]">扫描中…</span></div>
        ) : !live && pstate === "empty" ? (
          <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Sparkles className="size-7 text-slate-300" /><p className="mt-2">未发现任何技能</p></div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-slate-400">没有匹配的搜索结果</div>
        ) : (
          <div className="space-y-2">
            {list.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13.5px] text-slate-900">{s.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500">{s.invoke}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${s.origin === "内置" ? "bg-teal-50 text-teal-700" : s.origin === "插件" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500"}`}>{originLabel[s.origin]}</span>
                    <StateBadge state={s.health} />
                  </div>
                  <p className="mt-1 truncate text-[12px] text-slate-500">{s.desc}</p>
                  {s.origin === "插件" && <button onClick={() => navigate("settings", { tab: "plugin" })} className="mt-1 flex items-center gap-1 text-[11.5px] text-violet-600 hover:underline"><ExternalLink className="size-3" />来自插件 {plugins.find(p=>p.id===s.pluginId)?.name} · 前往插件管理</button>}
                </div>
                <button onClick={() => setDetail(s)} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">说明</button>
                <Toggle checked={s.enabled} onChange={(v) => {
                  if (live) {
                    void live.apply(v ? "启用技能" : "停用技能", async () => {
                      if (!live.backend.SetSkillEnabled) throw new Error("当前桌面后端缺少技能启停绑定");
                      await live.backend.SetSkillEnabled(s.name, v);
                    }).then((ok) => ok ? toast(v ? "已启用" : "已停用", { description: "技能启停仅影响后续会话" }) : toast.error("技能状态保存失败", { description: live.error }));
                  } else { setSkills((ss) => ss.map((x) => x.id === s.id ? { ...x, enabled: v } : x)); toast(v ? "已启用" : "已停用", { description: "技能启停仅影响后续会话" }); }
                }} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="mt-4">
        <Section title="技能来源目录" desc="移除来源只删除配置，不会删除用户目录或文件" actions={
          <div className="flex gap-1.5">
            <button onClick={() => {
              if (live) void live.apply("重新扫描技能", async () => { if (!live.backend.RefreshSkills) throw new Error("当前桌面后端缺少技能刷新绑定"); await live.backend.RefreshSkills(); }).then((ok) => ok ? toast.success("技能扫描完成") : toast.error("技能扫描失败", { description: live.error }));
              else { setPState("scanning"); toast("重新扫描中…"); setTimeout(() => setPState("normal"), 900); }
            }} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RefreshCw className="size-3.5" />重新扫描</button>
            <button onClick={() => {
              if (live) void (async () => {
                if (!live.backend.PickSkillFolder || !live.backend.AddSkillPath) { toast.error("当前桌面后端缺少技能目录绑定"); return; }
                const path = await live.backend.PickSkillFolder();
                if (!path) return;
                const ok = await live.apply("添加技能目录", () => live.backend.AddSkillPath!(path));
                ok ? toast.success("已添加技能目录") : toast.error("技能目录添加失败", { description: live.error });
              })();
              else { setDirs((d) => [...d, { path: "~/new/skills", exists: true, count: 0 }]); toast.success("已添加技能目录"); }
            }} className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[12px] text-white hover:bg-teal-700"><FolderPlus className="size-3.5" />添加目录</button>
          </div>
        }>
          <div className="space-y-2">
            {shownDirs.map((d) => (
              <div key={d.path} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5">
                {d.exists ? <span className="font-mono text-[12px] text-slate-700">{d.path}</span> : <span className="flex items-center gap-1 font-mono text-[12px] text-rose-600"><FolderX className="size-3.5" />{d.path}</span>}
                <span className="text-[11px] text-slate-400">{d.exists ? `${d.count} 个技能` : "目录缺失"}</span>
                {d.removable && <button onClick={() => setRemoveDir(d.path)} className="ml-auto text-[11.5px] text-rose-600 hover:underline">移除配置</button>}
              </div>
            ))}
          </div>
        </Section>
      </div>

      {detail && (
        <Drawer title={detail.name} onClose={() => setDetail(null)}>
          <div className="flex items-center gap-1.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{detail.invoke}</span><span className="text-[11.5px] text-slate-400">{originLabel[detail.origin]}</span></div>
          <p className="text-[13px] leading-relaxed text-slate-600">{detail.desc}</p>
          <div className="rounded-lg bg-slate-50 p-3 text-[12px] text-slate-500">该技能会在匹配到相应场景时被调用，具体行为由来源目录中的定义决定。外部技能会真实标注来源，不会伪装成内置技能。</div>
        </Drawer>
      )}

      <ConfirmDialog open={!!removeDir} title="移除技能来源" tone="amber" confirmText="移除配置" onConfirm={() => {
        if (live && removeDir) void live.apply("移除技能来源", async () => { if (!live.backend.RemoveSkillPath) throw new Error("当前桌面后端缺少技能目录移除绑定"); await live.backend.RemoveSkillPath(removeDir); }).then((ok) => { if (ok) { setRemoveDir(null); toast.success("已移除来源配置", { description: "用户目录与文件未被删除" }); } else toast.error("技能来源移除失败", { description: live.error }); });
        else { setDirs((d) => d.filter((x) => x.path !== removeDir)); setRemoveDir(null); toast.success("已移除来源配置", { description: "用户目录与文件未被删除" }); }
      }} onCancel={() => setRemoveDir(null)}>
        仅从{brand.productName}中移除该来源的配置，不会删除磁盘上的目录或文件。
      </ConfirmDialog>
    </SettingsBody>
  );
}
