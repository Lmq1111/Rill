import { useEffect, useState } from "react";
import { ChevronRight, ExternalLink, FolderOpen, Lock, ShieldCheck } from "lucide-react";
import type { RillSettingsContextValue } from "../../../settings/runtime";
import { brand } from "../../../../lib/brand";
import { SettingsBody, type GoTo } from "../Settings";
import { Row, Section, Toggle } from "../kit";

function status(enabled: boolean) {
  return enabled ? "已开启" : "已关闭";
}

export function LiveAboutSettings({ live, goTo }: { live: RillSettingsContextValue; goTo: GoTo }) {
  const settings = live.snapshot?.settings;
  const [version, setVersion] = useState("dev");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    if (live.backend.Version) void live.backend.Version().then((value) => { if (active) setVersion(value); }).catch((error) => { if (active) setActionError(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, [live.backend]);

  if (!settings) {
    return <SettingsBody title="版本与隐私" desc={`查看${brand.productName}与 ${brand.cliBrand} 的版本、更新方式、数据边界与开源归属`}><div className="rounded-xl border border-slate-200 bg-white p-5 text-[13px] text-slate-500">{live.loading ? "正在读取版本与隐私状态…" : live.error || "版本与隐私状态不可用"}</div></SettingsBody>;
  }

  const applyToggle = (label: string, method: "SetDesktopCheckUpdates" | "SetDesktopTelemetry" | "SetDesktopMetrics", enabled: boolean) => {
    void live.apply(label, async () => {
      const binding = live.backend[method];
      if (!binding) throw new Error(`当前桌面后端缺少 ${method} 绑定`);
      await binding.call(live.backend, enabled);
    });
  };

  const openReleases = async () => {
    try {
      if (!live.backend.OpenRillReleases) throw new Error("当前桌面后端缺少 Rill Releases 入口");
      await live.backend.OpenRillReleases();
      setActionError("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  const revealConfig = async () => {
    try {
      if (!live.backend.RevealPath) throw new Error("当前桌面后端缺少目录打开绑定");
      await live.backend.RevealPath(settings.configPath);
      setActionError("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <SettingsBody title="版本与隐私" desc={`查看${brand.productName}与 ${brand.cliBrand} 的版本、更新方式、数据边界与开源归属，并可主动导出脱敏诊断`}>
      {(live.error || actionError) && <div role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{actionError || live.error}</div>}
      <Section title="版本信息">
        <Row label="产品名称"><span className="text-[13px] text-slate-700">{brand.productName}</span></Row>
        <Row label="命令行品牌"><span className="text-[13px] text-slate-700">{brand.cliBrand}</span></Row>
        <Row label="当前版本"><span className="font-mono text-[13px] text-slate-700">{version}</span></Row>
        <Row label="运行平台 / 架构"><span className="font-mono text-[13px] text-slate-700">{navigator.platform || "当前系统"}</span></Row>
      </Section>

      <div className="mt-4"><Section title="更新" desc="公开版本入口固定指向 Lmq1111/Rill，不在本页执行下载或安装"><div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-600"><div className="flex items-center gap-1.5 text-slate-700"><ShieldCheck className="size-4 text-emerald-600" />公开 Release 手动入口</div><p className="mt-1">只有点击下方按钮时才会打开浏览器；当前页不会自动下载或安装更新。</p></div><button onClick={() => void openReleases()} className="mt-3 flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] text-white"><ExternalLink className="size-4" />打开 Rill Releases</button></Section></div>

      <div className="mt-4"><Section title="当前隐私与后台行为" desc="以下状态直接来自当前后端配置，修改后会重新读取确认">
        <Row label="启动时检查更新" hint={`当前：${status(settings.checkUpdates)}`}><Toggle checked={settings.checkUpdates} onChange={(enabled) => applyToggle("保存更新检查设置", "SetDesktopCheckUpdates", enabled)} /></Row>
        <Row label="匿名启动遥测" hint={`当前：${status(settings.telemetry)}`}><Toggle checked={settings.telemetry} onChange={(enabled) => applyToggle("保存遥测设置", "SetDesktopTelemetry", enabled)} /></Row>
        <Row label="聚合桌面指标" hint={`当前：${status(settings.metrics)}`}><Toggle checked={settings.metrics} onChange={(enabled) => applyToggle("保存指标设置", "SetDesktopMetrics", enabled)} /></Row>
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-500"><div className="flex items-center gap-1.5 text-slate-700"><Lock className="size-3.5" />敏感凭据不在本页显示</div><p className="mt-1">模型密钥、机器人 Token 和代理密码只显示是否已配置，不回传原文。</p></div>
      </Section></div>

      <div className="mt-4"><Section title="本机配置"><Row label="用户配置文件"><button onClick={() => void revealConfig()} className="flex max-w-md items-center gap-1.5 truncate font-mono text-[12px] text-slate-600 hover:text-teal-700" title={settings.configPath}><FolderOpen className="size-3.5 shrink-0" />{settings.configPath}</button></Row></Section></div>

      <div className="mt-4"><Section title="本地诊断导出" desc="由你主动发起，只在本机生成，不自动上传" actions={<button onClick={() => goTo("diagnostics")} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200">完整诊断页<ChevronRight className="size-3.5" /></button>}><div className="rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600"><div className="text-slate-700">诊断导出会显示脱敏预览，并明确排除：</div><ul className="mt-1 list-disc space-y-0.5 pl-5"><li>API Key、Token、密码、Cookie 和认证请求头</li><li>会话正文、用户文件正文和未脱敏私人路径</li></ul></div></Section></div>

      <div className="mt-4"><Section title="开源归属与许可"><div className="space-y-2 text-[12.5px] text-slate-600"><p>本产品以 <span className="text-slate-800">MIT License</span> 分发，保留原项目版权声明与 NOTICE 文件。</p><p>{brand.productName} / {brand.cliBrand} 基于 <span className="text-slate-800">DeepSeek-Reasonix</span> 二次开发，相关归属声明予以保留。</p></div></Section></div>
    </SettingsBody>
  );
}
