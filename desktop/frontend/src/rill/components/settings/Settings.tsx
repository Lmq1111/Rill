import { useState } from "react";
import {
  ArrowLeft,
  Settings2,
  Cpu,
  Bot,
  Plug,
  Sparkles,
  Users,
  Package,
  Brain,
  Webhook,
  ShieldCheck,
  Box,
  Network,
  Stethoscope,
  Keyboard,
  Palette,
  Info,
} from "lucide-react";
import { useStore } from "../../state/visualStore";
import { settingsTabs, type SettingsTab } from "./data";
import { GeneralSettings } from "./GeneralSettings";
import { ModelSettings } from "./ModelSettings";
import { BotSettings } from "./BotSettings";
import { McpSettings } from "./McpSettings";
import { SkillSettings } from "./SkillSettings";
import { SubagentSettings } from "./SubagentSettings";
import { PluginSettings } from "./PluginSettings";
import { MemorySettings } from "./MemorySettings";

const icons = { Settings2, Cpu, Bot, Plug, Sparkles, Users, Package, Brain, Webhook, ShieldCheck, Box, Network, Stethoscope, Keyboard, Palette, Info } as const;

const groups = ["常规", "能力", "系统与安全"] as const;
const implementedTabs = new Set<SettingsTab>(["general", "model", "bot", "mcp", "skill", "subagent", "plugin", "memory"]);

export function Settings() {
  const { navigate, params } = useStore();
  const [tab, setTab] = useState<SettingsTab>((params.tab as SettingsTab) || "general");

  const pages: Partial<Record<SettingsTab, React.ReactNode>> = {
    general: <GeneralSettings />,
    model: <ModelSettings />,
    bot: <BotSettings />,
    mcp: <McpSettings />,
    skill: <SkillSettings />,
    subagent: <SubagentSettings />,
    plugin: <PluginSettings />,
    memory: <MemorySettings />,
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      {/* 左侧设置导航 */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <button onClick={() => navigate("workbench")} className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-3.5 text-[13px] text-slate-600 hover:bg-slate-50">
          <ArrowLeft className="size-4" /> 返回主工作台
        </button>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map((g) => (
            <div key={g} className="mb-2">
              <div className="px-2 pt-2 pb-1 text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{g}</div>
              <div className="space-y-0.5">
                {settingsTabs.filter((t) => t.group === g).map((t) => {
                  const Icon = icons[t.icon];
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { if (implementedTabs.has(t.id)) setTab(t.id); }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${active ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      <Icon className={`size-4 ${active ? "text-teal-600" : "text-slate-400"}`} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* 内容 */}
      <div className="min-h-0 flex-1 overflow-hidden">{pages[tab] ?? pages.general}</div>
    </div>
  );
}

/* 每个设置页共用的滚动容器 */
export function SettingsBody({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="mb-4">
          <h1 className="text-[18px] text-slate-900">{title}</h1>
          {desc && <p className="mt-1 text-[13px] text-slate-400">{desc}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function initialVisualState<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export type GoTo = (tab: SettingsTab) => void;
