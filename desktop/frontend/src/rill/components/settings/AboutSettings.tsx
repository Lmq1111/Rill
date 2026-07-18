import { useState } from "react";
import { RefreshCw, Copy, Download, FolderOpen, ShieldCheck, Lock, ChevronRight, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody, type GoTo } from "./Settings";
import { Section, Row } from "./kit";
import { useStore } from "../../state/visualStore";
import { brand } from "../../../lib/brand";

type Check = "latest" | "checking" | "found" | "noAccess" | "failed" | "offline";
type Diag = "idle" | "generating" | "done";

export function AboutSettings({ goTo }: { goTo: GoTo }) {
  const { params } = useStore();
  const [check, setCheck] = useState<Check>(() => initialVisualState(params.rillVisualState, ["latest", "checking", "found", "noAccess", "failed", "offline"] as const, "latest"));
  const [diag, setDiag] = useState<Diag>("idle");

  const runCheck = (result: Check) => { setCheck("checking"); toast("正在检查 GitHub Releases…"); setTimeout(() => setCheck(result), 1300); };

  const diagJson = JSON.stringify({
    app: `${brand.productName} ${brand.version} (build 20260718.1)`, cli: brand.cliBrand, platform: "macOS 15.4 arm64",
    autoUpdate: "disabled", telemetry: "disabled", crashReport: "disabled",
    redactedFields: ["apiKey", "token", "cookie", "sessionBody", "fileContents", "unauthorizedPaths"],
  }, null, 2);

  const genDiag = () => { setDiag("generating"); toast("正在生成脱敏诊断…"); setTimeout(() => { setDiag("done"); toast.success("诊断已生成"); }, 900); };

  const checkBanner: Record<Check, { cls: string; text: string }> = {
    latest: { cls: "bg-emerald-50 text-emerald-700", text: `当前已是最新版本 ${brand.version}` },
    checking: { cls: "bg-sky-50 text-sky-700", text: "正在检查 GitHub Releases…" },
    found: { cls: "bg-teal-50 text-teal-700", text: "发现新版本 0.2.0，可手动下载更新" },
    noAccess: { cls: "bg-amber-50 text-amber-700", text: "无法访问 GitHub Releases：请求未获授权或受到限流" },
    failed: { cls: "bg-rose-50 text-rose-700", text: "检查失败：请求 GitHub Releases 时发生错误" },
    offline: { cls: "bg-slate-100 text-slate-600", text: "当前离线，无法检查更新" },
  };

  return (
    <SettingsBody title="版本与隐私" desc={`查看${brand.productName}与 ${brand.cliBrand} 的版本、更新方式、数据边界与开源归属，并可主动导出脱敏诊断`}>
      <StateSwitcherLocal check={check} setCheck={setCheck} />

      <Section title="版本信息">
        <Row label="产品名称"><span className="text-[13px] text-slate-700">{brand.productName}</span></Row>
        <Row label="命令行品牌"><span className="text-[13px] text-slate-700">{brand.cliBrand}</span></Row>
        <Row label="当前版本"><span className="font-mono text-[13px] text-slate-700">{brand.version}</span></Row>
        <Row label="构建编号"><span className="font-mono text-[13px] text-slate-700">20260718.1</span></Row>
        <Row label="运行平台 / 架构"><span className="font-mono text-[13px] text-slate-700">macOS 15.4 · arm64</span></Row>
      </Section>

      <div className="mt-4">
        <Section title="更新" desc="仅访问 Rill 的 GitHub Releases，不访问上游升级接口">
          <div className={`mb-3 rounded-lg px-3 py-2 text-[12.5px] ${checkBanner[check].cls}`}>{checkBanner[check].text}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => runCheck("latest")} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] text-white hover:bg-teal-700"><RefreshCw className={`size-4 ${check === "checking" ? "animate-spin" : ""}`} />手动检查更新</button>
            {check === "found" && <button onClick={() => toast("打开 Rill Releases 下载页（演示）")} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"><Download className="size-4" />前往下载 0.2.0</button>}
            <span className="text-[11.5px] text-slate-400">最近检查：刚刚</span>
          </div>
          {check === "found" && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600"><div className="text-slate-700">0.2.0 版本说明（摘要）</div><ul className="mt-1 list-disc space-y-0.5 pl-5"><li>改进沙箱检测的准确性</li><li>诊断导出新增脱敏清单预览</li></ul></div>}
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-600">
            <div className="flex items-center gap-1.5 text-slate-700"><ShieldCheck className="size-4 text-emerald-600" />自动更新已关闭</div>
            <p className="mt-1">{brand.productName}不会在后台请求上游更新接口。更新仅通过上方手动检查发起。</p>
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="隐私与数据边界">
          {[
            { k: "崩溃报告", v: "已关闭" },
            { k: "遥测", v: "已关闭" },
            { k: "匿名指标", v: "已关闭" },
            { k: "自动崩溃上报", v: "已关闭" },
          ].map((r) => (
            <Row key={r.k} label={r.k}>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] text-slate-500"><Lock className="size-3" />{r.v}</span>
            </Row>
          ))}
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-500">上述项目均已关闭且不在本页提供重新开启的入口，{brand.productName}不会自动发送运行数据。</div>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="本机目录">
          {[
            { k: "配置目录", v: "~/.rillagent/config" },
            { k: "状态目录", v: "~/.rillagent/state" },
            { k: "缓存目录", v: "~/.rillagent/cache" },
          ].map((r) => (
            <Row key={r.k} label={r.k}>
              <button onClick={() => toast("在文件管理器中打开（演示）")} className="flex items-center gap-1.5 font-mono text-[12px] text-slate-600 hover:text-teal-700"><FolderOpen className="size-3.5" />{r.v}</button>
            </Row>
          ))}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="本地诊断导出" desc="由你主动发起，只在本机生成，不自动上传" actions={
          <button onClick={() => goTo("diagnostics")} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">完整诊断页<ChevronRight className="size-3.5" /></button>
        }>
          <div className="rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600">
            <div className="text-slate-700">诊断信息包含：</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5"><li>版本、平台、开关状态</li><li>各项检查的结果与说明</li></ul>
            <div className="mt-2 text-slate-700">不包含：</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5"><li>完整 API Key、Token、Cookie</li><li>会话正文、用户文件正文、未授权路径内容</li></ul>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={genDiag} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] text-white hover:bg-teal-700"><RefreshCw className={`size-4 ${diag === "generating" ? "animate-spin" : ""}`} />生成诊断</button>
            {diag === "done" && <>
              <button onClick={() => { navigator.clipboard?.writeText?.(diagJson); toast.success("已复制脱敏诊断"); }} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Copy className="size-4" />复制</button>
              <button onClick={() => toast.success("已导出脱敏诊断 JSON")} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Download className="size-4" />导出</button>
              <button onClick={() => toast.error("导出失败", { description: "无法写入所选位置" })} className="text-[11.5px] text-slate-400 hover:text-rose-600">模拟导出失败</button>
            </>}
          </div>
          {diag === "done" && <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-100">{diagJson}</pre>}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="开源归属与许可">
          <div className="space-y-2 text-[12.5px] text-slate-600">
            <p>本产品以 <span className="text-slate-800">MIT License</span> 分发，保留原项目版权声明与 NOTICE 文件。</p>
            <p>{brand.productName} / {brand.cliBrand} 基于 <span className="text-slate-800">DeepSeek-Reasonix</span> 二次开发，相关归属声明予以保留。</p>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-slate-700"><ShieldCheck className="size-4 text-emerald-600" />唯一保留的 reasonix.io 运行时依赖</div>
              <p className="mt-1">经过 <span className="font-mono">minisign</span> 校验的只读 Reasonix MCP 插件目录，是唯一保留的 reasonix.io 运行时依赖，除此之外不连接 reasonix.io。</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["查看许可证", "隐私说明", "版本说明", "NOTICE"].map((l) => (
              <button key={l} onClick={() => toast(`打开${l}（演示）`)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{l === "版本说明" || l === "NOTICE" ? <FileText className="size-3.5" /> : <ExternalLink className="size-3.5" />}{l}</button>
            ))}
          </div>
        </Section>
      </div>
    </SettingsBody>
  );
}

function StateSwitcherLocal({ check, setCheck }: { check: Check; setCheck: (c: Check) => void }) {
  const opts: { id: Check; label: string }[] = [
    { id: "latest", label: "已是最新" }, { id: "checking", label: "检查中" }, { id: "found", label: "发现新版本" },
    { id: "noAccess", label: "无访问权限" }, { id: "failed", label: "检查失败" }, { id: "offline", label: "离线" },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] text-slate-400">演示状态：</span>
      {opts.map((o) => <button key={o.id} aria-pressed={check === o.id} onClick={() => setCheck(o.id)} className={`rounded-full px-2.5 py-1 text-[11.5px] ${check === o.id ? "bg-teal-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{o.label}</button>)}
    </div>
  );
}
