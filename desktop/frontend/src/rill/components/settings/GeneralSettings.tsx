import { useEffect, useState } from "react";
import { Play, AlertTriangle, RotateCw, GripVertical, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { brand } from "../../../lib/brand";
import { Section, Row, Select, Toggle, SaveBar, StateSwitcher } from "./kit";
import { useStore } from "../../state/visualStore";
import { useRillSettingsOptional } from "../../settings/runtime";

type PState = "loading" | "normal" | "running";

const statusItems = ["模型", "分支", "上下文占用", "Token 用量", "运行状态", "工作目录"];

export function GeneralSettings() {
  const { params, active } = useStore();
  const live = useRillSettingsOptional();
  const persisted = live?.snapshot?.settings;
  const [pstate, setPState] = useState<PState>(() => initialVisualState(params.rillVisualState, ["loading", "normal", "running"] as const, "normal"));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [lang, setLang] = useState("简体中文");
  const [mode, setMode] = useState("工作台模式");
  const [closeBehavior, setCloseBehavior] = useState("最小化到托盘");
  const [display, setDisplay] = useState("紧凑");
  const [toolExpand, setToolExpand] = useState(false);
  const [perm, setPerm] = useState("需确认");
  const [autoPlan, setAutoPlan] = useState(true);
  const [memoryCompile, setMemoryCompile] = useState(true);
  const [density, setDensity] = useState("标准");
  const [items, setItems] = useState(statusItems);

  const change = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };
  const running = live ? active.runState === "aiRunning" || active.runState === "awaitingConfirm" || active.runState === "awaitingAnswer" : pstate === "running";

  useEffect(() => {
    if (!persisted) return;
    setLang(persisted.desktopLanguage === "en" ? "English" : persisted.desktopLanguage === "zh-TW" ? "繁體中文" : "简体中文");
    setMode(persisted.desktopLayoutStyle === "creation" ? "创作模式" : persisted.desktopLayoutStyle === "classic" ? "经典模式" : "工作台模式");
    setCloseBehavior(persisted.closeBehavior === "quit" ? "退出程序" : "最小化到托盘");
    setDisplay(persisted.displayMode === "compact" ? "紧凑" : "标准");
    setToolExpand(Boolean(persisted.expandThinking));
    setPerm(persisted.defaultToolApprovalMode === "yolo" ? "YOLO" : persisted.defaultToolApprovalMode === "auto" ? "自动" : persisted.defaultToolApprovalMode === "deny" ? "只读" : "需确认");
    setAutoPlan(persisted.autoPlan === "on" || persisted.autoPlan === "ask");
    setMemoryCompile(persisted.memoryCompilerEnabled);
    setDensity(persisted.statusBarStyle === "icon" ? "精简" : "标准");
    const labels: Record<string, string> = { model: "模型", git_branch: "分支", context: "上下文占用", session_tokens: "Token 用量", session_turns: "运行状态", workspace: "工作目录" };
    setItems((persisted.statusBarItems ?? []).map((id) => labels[id] ?? id));
    setDirty(false);
  }, [persisted]);

  const save = async () => {
    if (live) {
      const ids: Record<string, string> = { 模型: "model", 分支: "git_branch", 上下文占用: "context", "Token 用量": "session_tokens", 运行状态: "session_turns", 工作目录: "workspace" };
      const ok = await live.apply("保存通用设置", async () => {
        const b = live.backend;
        if (!b.SetGeneralSettings) throw new Error("当前桌面后端缺少原子通用设置绑定");
        await b.SetGeneralSettings({
          language: lang === "English" ? "en" : "zh",
          layoutStyle: mode === "创作模式" ? "creation" : mode === "经典模式" ? "classic" : "workbench",
          closeBehavior: closeBehavior === "退出程序" ? "quit" : "background",
          displayMode: display === "紧凑" ? "compact" : "standard",
          expandThinking: toolExpand,
          defaultToolApprovalMode: perm === "YOLO" ? "yolo" : perm === "自动" ? "auto" : "ask",
          autoPlan: autoPlan ? "on" : "off",
          memoryCompilerEnabled: memoryCompile,
          statusBarStyle: density === "精简" ? "icon" : "text",
          statusBarItems: items.map((item) => ids[item] ?? item),
        });
      });
      if (ok) {
        setDirty(false);
        toast.success("设置已保存", { description: "语言变更需重启后完全生效" });
      } else toast.error("设置保存失败", { description: live.error || "后端未确认保存" });
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false); setDirty(false);
      toast.success("设置已保存", { description: "语言变更需重启后完全生效" });
    }, 900);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next); setDirty(true);
  };

  return (
    <SettingsBody title="通用" desc={`管理${brand.productName}桌面端的常用行为、默认执行方式、声音与状态信息`}>
      {!live && <StateSwitcher value={pstate} onChange={setPState} options={[{ id: "loading", label: "加载中" }, { id: "normal", label: "正常" }, { id: "running", label: "运行中（不可修改）" }]} />}

      {live?.error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{live.error}</div>}

      {(live?.loading && !persisted) || (!live && pstate === "loading") ? (
        <div className="grid place-items-center rounded-xl border border-slate-200 bg-white p-16 text-slate-400"><RotateCw className="size-6 animate-spin" /><span className="mt-2 text-[13px]">设置加载中…</span></div>
      ) : (
        <>
          {running && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-700">
              <AlertTriangle className="size-4" /> 会话正在运行，部分设置暂不可修改，请等待运行结束。
            </div>
          )}

          <div className={running ? "pointer-events-none opacity-60" : ""}>
            <Section title="界面与模式">
              <Row label="界面语言" hint="保存后更新桌面端文案，需重启后完全生效">
                <Select value={lang} onChange={change(setLang)} options={live ? ["简体中文", "English"] : ["简体中文", "English", "繁體中文"]} />
              </Row>
              <Row label="桌面工作模式" hint="经典 / 工作台 / 创作模式">
                <Select value={mode} onChange={change(setMode)} options={["经典模式", "工作台模式", "创作模式"]} />
              </Row>
              <Row label="关闭窗口行为">
                <Select value={closeBehavior} onChange={change(setCloseBehavior)} options={live ? ["退出程序", "最小化到托盘"] : ["退出程序", "最小化到托盘", "保留后台运行"]} />
              </Row>
              <Row label="内容显示模式">
                <Select value={display} onChange={change(setDisplay)} options={live ? ["紧凑", "标准"] : ["紧凑", "标准", "宽松"]} />
              </Row>
              <Row label="工具过程默认展开" hint="控制工具调用与推理过程的默认折叠状态">
                <Toggle checked={toolExpand} onChange={change(setToolExpand)} />
              </Row>
            </Section>

            <div className="mt-4">
              <Section title="默认执行行为">
                <Row label="默认工具权限模式" hint="仅影响新会话；已打开会话不受影响">
                  <Select value={perm} onChange={change(setPerm)} options={live ? ["需确认", "自动", "YOLO"] : ["只读", "需确认", "自动", "YOLO"]} />
                </Row>
                {(perm === "自动" || perm === "YOLO") && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-[11.5px] text-rose-700 ring-1 ring-rose-200">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                    {perm === "YOLO" ? "YOLO：全部操作不经确认自动执行，风险最高。" : "自动：常规操作自动执行，高权限操作仍需确认。"}
                  </div>
                )}
                <Row label="自动进入计划流程" hint="复杂任务自动先规划再执行（仅影响新会话）">
                  <Toggle checked={autoPlan} onChange={change(setAutoPlan)} />
                </Row>
                <Row label="启用记忆编译能力" hint="在会话结束后编译可长期参考的记忆">
                  <Toggle checked={memoryCompile} onChange={change(setMemoryCompile)} />
                </Row>
              </Section>
            </div>

            {!live && <div className="mt-4">
              <Section title="提示音与背景音">
                {[["成功提示音", "叮咚"], ["需要注意提示音", "提示音 2"], ["生成式背景音乐", "关闭"]].map(([label, val]) => (
                  <Row key={label} label={label}>
                    <div className="flex items-center gap-2">
                      <Select value={val} onChange={() => setDirty(true)} options={[val, "关闭", "其他"]} />
                      <button onClick={() => toast("试听中…")} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Play className="size-3.5" />试听</button>
                    </div>
                  </Row>
                ))}
              </Section>
            </div>}

            <div className="mt-4">
              <Section title="状态栏" desc="信息密度、显示项目与顺序">
                <Row label="信息密度">
                  <Select value={density} onChange={change(setDensity)} options={live ? ["精简", "标准"] : ["精简", "标准", "详细"]} />
                </Row>
                <div className="mt-2 space-y-1.5">
                  {items.map((it, i) => (
                    <div key={it} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <GripVertical className="size-4 text-slate-300" />
                      <span className="flex-1 text-[13px] text-slate-700">{it}</span>
                      <button onClick={() => move(i, -1)} className="rounded px-1.5 text-[12px] text-slate-400 hover:bg-slate-100">↑</button>
                      <button onClick={() => move(i, 1)} className="rounded px-1.5 text-[12px] text-slate-400 hover:bg-slate-100">↓</button>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>

          <SaveBar dirty={dirty} saving={live?.saving ?? saving} onSave={() => void save()} onReset={() => {
            if (persisted) {
              setLang(persisted.desktopLanguage === "en" ? "English" : persisted.desktopLanguage === "zh-TW" ? "繁體中文" : "简体中文");
              setMode(persisted.desktopLayoutStyle === "creation" ? "创作模式" : persisted.desktopLayoutStyle === "classic" ? "经典模式" : "工作台模式");
              setCloseBehavior(persisted.closeBehavior === "quit" ? "退出程序" : "最小化到托盘");
              setDisplay(persisted.displayMode === "compact" ? "紧凑" : "标准");
            }
            setDirty(false); toast("已放弃修改");
          }} note="语言等设置需重启后生效" />
        </>
      )}
    </SettingsBody>
  );
}
