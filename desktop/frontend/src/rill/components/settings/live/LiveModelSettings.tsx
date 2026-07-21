import { useMemo, useState } from "react";
import { Brain, Cpu, Image as ImageIcon, Plus, RefreshCw, Trash2, Wifi } from "lucide-react";
import type { ProviderView } from "../../../../lib/types";
import type { RillSettingsContextValue } from "../../../settings/runtime";
import { SettingsBody } from "../Settings";
import { ConfirmDialog, Drawer, Row, Section, Select, StateBadge } from "../kit";

function emptyProvider(kinds: string[]): ProviderView {
  return {
    name: "",
    builtIn: false,
    added: true,
    kind: kinds[0] || "openai",
    baseUrl: "",
    chatUrl: "",
    models: [],
    visionModels: [],
    visionModelsConfigured: false,
    modelsUrl: "",
    default: "",
    apiKeyEnv: "",
    headers: {},
    extraBody: {},
    authHeader: false,
    keySet: false,
    requiresKey: true,
    configured: false,
    keySource: "",
    keySourcePath: "",
    balanceUrl: "",
    contextWindow: 0,
    reasoningProtocol: "auto",
    thinking: "",
    supportedEfforts: [],
    defaultEffort: "",
    modelOverrides: [],
  };
}

function providerState(provider: ProviderView) {
  if (!provider.added) return "disabled";
  if (provider.requiresKey !== false && !provider.keySet) return "missingKey";
  return provider.configured === false ? "failed" : "connected";
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function SecretEditor({ provider, live }: { provider: ProviderView; live: RillSettingsContextValue }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const save = async () => {
    if (!value.trim()) return;
    const ok = await live.apply("保存模型密钥", async () => {
      if (!live.backend.SetProviderKey) throw new Error("当前桌面后端缺少模型密钥保存绑定");
      await live.backend.SetProviderKey(provider.apiKeyEnv, value);
    });
    if (ok) {
      setValue("");
      setEditing(false);
    }
  };
  const clear = async () => {
    const ok = await live.apply("清除模型密钥", async () => {
      if (!live.backend.ClearProviderKey) throw new Error("当前桌面后端缺少模型密钥清除绑定");
      await live.backend.ClearProviderKey(provider.apiKeyEnv);
    });
    if (ok) setEditing(false);
  };
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-slate-500">API Key（环境变量 {provider.apiKeyEnv || "未设置"}）</span>
        <span className="text-[11px] text-slate-400">不显示原文</span>
      </div>
      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <input type="password" value={value} onChange={(event) => setValue(event.target.value)} autoComplete="new-password" placeholder="输入新密钥" className="min-w-0 flex-1 rounded-md bg-white px-3 py-1.5 font-mono text-[12px] ring-1 ring-slate-200 outline-none focus:ring-teal-300" />
          <button disabled={live.saving || !value.trim()} onClick={() => void save()} className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-[12px] text-white disabled:opacity-40">保存</button>
          <button disabled={live.saving} onClick={() => { setEditing(false); setValue(""); }} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200">取消</button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 rounded-md bg-white px-3 py-1.5 font-mono text-[12px] text-slate-400 ring-1 ring-slate-200">{provider.keySet ? "•••••••••••••••• 已保存" : "未配置"}</div>
          <button disabled={live.saving || !provider.apiKeyEnv} onClick={() => setEditing(true)} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40">{provider.keySet ? "替换" : "保存"}</button>
          {provider.keySet && <button disabled={live.saving} onClick={() => void clear()} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-rose-600 ring-1 ring-rose-200 disabled:opacity-40">清除</button>}
        </div>
      )}
    </div>
  );
}

export function LiveModelSettings({ live }: { live: RillSettingsContextValue }) {
  const settings = live.snapshot?.settings;
  const providers = settings?.providers.filter((provider) => provider.added) ?? [];
  const [editing, setEditing] = useState<ProviderView | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [modelsDraft, setModelsDraft] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [connection, setConnection] = useState<Record<string, string>>({});

  const modelRefs = useMemo(() => {
    const refs = providers.flatMap((provider) => provider.models.map((model) => `${provider.name}/${model}`));
    for (const value of [settings?.defaultModel, settings?.plannerModel, settings?.subagentModel]) {
      if (value && !refs.includes(value)) refs.push(value);
    }
    return refs.length > 0 ? refs : [""];
  }, [providers, settings?.defaultModel, settings?.plannerModel, settings?.subagentModel]);

  if (!settings) {
    return <SettingsBody title="模型" desc="接入模型服务、管理密钥与可用模型，并指定不同任务的默认模型"><div className="rounded-xl border border-slate-200 bg-white p-5 text-[13px] text-slate-500">{live.loading ? "正在读取模型设置…" : live.error || "模型设置不可用"}</div></SettingsBody>;
  }

  const openEditor = (provider?: ProviderView) => {
    const next = provider ? structuredClone(provider) : emptyProvider(settings.providerKinds);
    setEditing(next);
    setModelsDraft(next.models.join(", "));
    setKeyDraft("");
  };

  const saveProvider = async () => {
    if (!editing) return;
    const provider = { ...editing, models: modelsDraft.split(",").map((item) => item.trim()).filter(Boolean) };
    if (!provider.name.trim() || !provider.baseUrl.trim()) return;
    const ok = await live.apply("保存模型服务商", async () => {
      if (keyDraft.trim()) {
        if (!live.backend.SaveProviderWithKey) throw new Error("当前桌面后端缺少服务商与密钥保存绑定");
        await live.backend.SaveProviderWithKey(provider, keyDraft);
      } else {
        if (!live.backend.SaveProvider) throw new Error("当前桌面后端缺少服务商保存绑定");
        await live.backend.SaveProvider(provider);
      }
    });
    if (ok) {
      setEditing(null);
      setKeyDraft("");
    }
  };

  const refreshModels = async (provider: ProviderView) => {
    setConnection((current) => ({ ...current, [provider.name]: "testing" }));
    try {
      const ok = await live.apply("刷新模型列表", async () => {
        if (!live.backend.FetchProviderModels || !live.backend.SaveProvider) throw new Error("当前桌面后端缺少模型刷新绑定");
        const models = await live.backend.FetchProviderModels(provider);
        await live.backend.SaveProvider({ ...provider, models, default: models.includes(provider.default) ? provider.default : models[0] || "" });
      });
      setConnection((current) => ({ ...current, [provider.name]: ok ? "connected" : "failed" }));
    } catch (error) {
      setConnection((current) => ({ ...current, [provider.name]: "failed" }));
      setConnection((current) => ({ ...current, [`${provider.name}:error`]: messageOf(error) }));
    }
  };

  const setDefault = (label: string, method: "SetDefaultModel" | "SetPlannerModel" | "SetSubagentModel", value: string) => {
    void live.apply(label, async () => {
      const binding = live.backend[method];
      if (!binding) throw new Error(`当前桌面后端缺少 ${method} 绑定`);
      await binding.call(live.backend, value);
    });
  };

  return (
    <SettingsBody title="模型" desc="接入模型服务、管理密钥与可用模型，并指定不同任务的默认模型">
      {live.error && <div role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{live.error}</div>}
      <Section title="模型服务商" desc="官方预设或 OpenAI / Anthropic 兼容的自定义服务商" actions={<button disabled={live.saving} onClick={() => openEditor()} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white disabled:opacity-40"><Plus className="size-4" />添加服务商</button>}>
        {providers.length === 0 ? <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Cpu className="size-7 text-slate-300" /><p className="mt-2">还没有接入任何服务商</p></div> : (
          <div className="space-y-2">
            {providers.map((provider) => (
              <div key={provider.name} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] text-slate-900">{provider.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{provider.builtIn ? "官方预设" : `${provider.kind} 兼容`}</span>
                  <StateBadge state={connection[provider.name] || providerState(provider)} />
                  <div className="ml-auto flex items-center gap-1.5">
                    <button disabled={live.saving} onClick={() => void refreshModels(provider)} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"><Wifi className="size-3.5" />测试并刷新</button>
                    <button disabled={live.saving} onClick={() => openEditor(provider)} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200"><RefreshCw className="size-3.5" />编辑</button>
                    {!provider.builtIn && <button disabled={live.saving} onClick={() => setDeleteName(provider.name)} className="grid size-7 place-items-center rounded-lg text-rose-500 ring-1 ring-slate-200"><Trash2 className="size-3.5" /></button>}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-400"><span className="font-mono">{provider.baseUrl}</span><span>密钥：{provider.keySet ? "已配置" : provider.requiresKey === false ? "无需密钥" : "缺少密钥"}</span><span>可用模型：{provider.models.length}</span></div>
                {provider.models.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{provider.models.map((model) => <span key={model} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">{model}{provider.visionModels.includes(model) && <ImageIcon className="size-3 text-sky-500" />}{provider.supportedEfforts.length > 0 && <Brain className="size-3 text-indigo-500" />}</span>)}</div>}
                {connection[`${provider.name}:error`] && <div className="mt-2 rounded-md bg-rose-50 px-2.5 py-1.5 text-[11.5px] text-rose-700">{connection[`${provider.name}:error`]}</div>}
                {provider.requiresKey !== false && <SecretEditor provider={provider} live={live} />}
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="mt-4"><Section title="默认模型" desc="保存由后端确认，不可用模型不会被静默接受">
        <Row label="默认执行模型"><Select value={settings.defaultModel} onChange={(value) => setDefault("保存默认执行模型", "SetDefaultModel", value)} options={modelRefs} /></Row>
        <Row label="规划模型"><Select value={settings.plannerModel} onChange={(value) => setDefault("保存规划模型", "SetPlannerModel", value)} options={modelRefs} /></Row>
        <Row label="子智能体默认模型"><Select value={settings.subagentModel} onChange={(value) => setDefault("保存子智能体模型", "SetSubagentModel", value)} options={modelRefs} /></Row>
      </Section></div>

      <div className="mt-4"><Section title="运行限制">
        <Row label="子智能体默认推理强度"><Select value={settings.subagentEffort || "auto"} onChange={(value) => void live.apply("保存推理强度", async () => { if (!live.backend.SetSubagentEffort) throw new Error("当前桌面后端缺少推理强度绑定"); await live.backend.SetSubagentEffort(value); })} options={["auto", "low", "medium", "high", "xhigh", "max"]} /></Row>
      </Section></div>

      {editing && <Drawer title={editing.name ? `编辑服务商 · ${editing.name}` : "添加自定义服务商"} onClose={() => setEditing(null)} footer={<><button onClick={() => setEditing(null)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200">取消</button><button disabled={live.saving || !editing.name.trim() || !editing.baseUrl.trim()} onClick={() => void saveProvider()} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white disabled:opacity-40">保存</button></>}>
        <label className="block"><span className="text-[12px] text-slate-500">名称</span><input disabled={Boolean(providers.find((provider) => provider.name === editing.name))} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300 disabled:bg-slate-50" /></label>
        <label className="block"><span className="text-[12px] text-slate-500">协议类型</span><select value={editing.kind} onChange={(event) => setEditing({ ...editing, kind: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{(settings.providerKinds.length ? settings.providerKinds : ["openai", "anthropic"]).map((kind) => <option key={kind}>{kind}</option>)}</select></label>
        <label className="block"><span className="text-[12px] text-slate-500">API 地址（Base URL）</span><input value={editing.baseUrl} onChange={(event) => setEditing({ ...editing, baseUrl: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
        <label className="block"><span className="text-[12px] text-slate-500">模型（逗号分隔，可保存后刷新）</span><input value={modelsDraft} onChange={(event) => setModelsDraft(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" /></label>
        <label className="block"><span className="text-[12px] text-slate-500">密钥环境变量名</span><input value={editing.apiKeyEnv} onChange={(event) => setEditing({ ...editing, apiKeyEnv: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
        <label className="block"><span className="text-[12px] text-slate-500">新密钥（留空表示保留现有值）</span><input type="password" autoComplete="new-password" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" /></label>
      </Drawer>}

      <ConfirmDialog open={Boolean(deleteName)} title="删除服务商" onCancel={() => setDeleteName("")} onConfirm={() => void live.apply("删除模型服务商", async () => { if (!live.backend.DeleteProvider) throw new Error("当前桌面后端缺少服务商删除绑定"); await live.backend.DeleteProvider(deleteName); }).then((ok) => { if (ok) setDeleteName(""); })} confirmText="删除服务商">删除后，引用该服务商的默认模型可能失效；后端会阻止仍被运行会话占用的删除。</ConfirmDialog>
    </SettingsBody>
  );
}
