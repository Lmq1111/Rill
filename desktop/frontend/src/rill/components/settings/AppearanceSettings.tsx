import { useState } from "react";
import { RotateCcw, AlertTriangle, Monitor, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { SettingsBody } from "./Settings";
import { Section, Row, Select, SaveBar, ConfirmDialog } from "./kit";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";

const BODY_FONTS = ["系统默认", "PingFang SC", "Inter", "Source Han Sans", "未安装字体示例"];
const CODE_FONTS = ["系统等宽", "JetBrains Mono", "Fira Code", "SF Mono"];
const AVAILABLE = new Set(["系统默认", "PingFang SC", "Inter", "Source Han Sans", "系统等宽", "JetBrains Mono", "SF Mono"]);

export function AppearanceSettings() {
  const { params } = useStore();
  const visualMode: Record<string, string> = { system: "跟随系统", light: "浅色", dark: "深色" };
  const [mode, setMode] = useState(() => visualMode[params.rillVisualState] ?? "跟随系统");
  const [theme, setTheme] = useState(`${brand.productName}·浅青`);
  const [textSize, setTextSize] = useState(14);
  const [bodyFont, setBodyFont] = useState("系统默认");
  const [codeFont, setCodeFont] = useState("JetBrains Mono");
  const [scale, setScale] = useState("100%");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reset, setReset] = useState(false);

  const d = () => setDirty(true);
  const bodyUnavailable = !AVAILABLE.has(bodyFont);
  const effectiveBody = bodyUnavailable ? "系统默认（回退）" : bodyFont;
  // Windows 缩放需重启
  const needsRestart = scale !== "100%";

  return (
    <SettingsBody title="外观" desc={`调整${brand.productName}的显示偏好，实时预览效果，并可恢复默认值`}>
      <Section title="显示模式">
        <Row label="主题模式" hint="跟随系统会随操作系统深浅色设置变化">
          <div className="flex gap-1.5">
            {[{ v: "跟随系统", i: Monitor }, { v: "浅色", i: Sun }, { v: "深色", i: Moon }].map((o) => (
              <button key={o.v} aria-pressed={mode === o.v} onClick={() => { setMode(o.v); d(); }} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] ${mode === o.v ? "bg-teal-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}><o.i className="size-3.5" />{o.v}</button>
            ))}
          </div>
        </Row>
        <Row label="主题变体"><Select value={theme} onChange={(v) => { setTheme(v); d(); }} options={[`${brand.productName}·浅青`, `${brand.productName}·石墨`, "高对比"]} /></Row>
      </Section>

      <div className="mt-4">
        <Section title="文字与字体">
          <Row label="界面文字大小" hint={`${textSize}px`}>
            <input type="range" min={12} max={18} value={textSize} onChange={(e) => { setTextSize(+e.target.value); d(); }} className="w-40 accent-teal-600" />
          </Row>
          <Row label="正文字体"><Select value={bodyFont} onChange={(v) => { setBodyFont(v); d(); }} options={BODY_FONTS} /></Row>
          <Row label="代码字体"><Select value={codeFont} onChange={(v) => { setCodeFont(v); d(); }} options={CODE_FONTS} /></Row>
          {bodyUnavailable && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-700"><AlertTriangle className="size-4" />所选正文字体不可用，已自动回退到系统默认字体（不影响阅读）。</div>}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="Windows 缩放" desc="仅 Windows 生效，修改后需重新启动">
          <Row label="应用缩放比例" hint={needsRestart ? "重新启动后生效" : undefined}><Select value={scale} onChange={(v) => { setScale(v); d(); }} options={["100%", "125%", "150%", "175%"]} /></Row>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="预览">
          <div className={`rounded-xl border p-4 ${mode === "深色" ? "bg-slate-900" : "bg-white"} border-slate-200`} style={{ fontSize: textSize }}>
            <div className={mode === "深色" ? "text-slate-100" : "text-slate-900"}>{brand.productName} · 主工作台预览</div>
            <p className={`mt-1 ${mode === "深色" ? "text-slate-400" : "text-slate-500"}`} style={{ fontSize: textSize - 1 }}>正文字体：{effectiveBody} · 主题：{theme}</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-white" style={{ fontSize: textSize - 1 }}>示例按钮</div>
            <pre className="mt-2 rounded-lg bg-slate-950 p-2 text-slate-100" style={{ fontFamily: "monospace", fontSize: textSize - 2 }}>$ {brand.executable} run --task demo · 字体 {codeFont}</pre>
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <button onClick={() => setReset(true)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw className="size-4" />恢复默认值</button>
      </div>

      <SaveBar dirty={dirty} saving={saving} note={needsRestart ? "缩放需重新启动后生效" : undefined} onSave={() => { setSaving(true); setTimeout(() => { setSaving(false); setDirty(false); toast.success("外观设置已保存", needsRestart ? { description: "缩放将在重新启动后生效" } : undefined); }, 600); }} onReset={() => { setDirty(false); toast("已放弃修改"); }} />

      <ConfirmDialog open={reset} title="恢复默认外观" tone="amber" confirmText="恢复默认" onConfirm={() => { setMode("跟随系统"); setTheme(`${brand.productName}·浅青`); setTextSize(14); setBodyFont("系统默认"); setCodeFont("JetBrains Mono"); setScale("100%"); setDirty(true); setReset(false); toast.success("已恢复默认外观"); }} onCancel={() => setReset(false)}>
        将重置以下显示偏好：主题模式、主题变体、文字大小、正文与代码字体、Windows 缩放比例。确认恢复？
      </ConfirmDialog>
    </SettingsBody>
  );
}
