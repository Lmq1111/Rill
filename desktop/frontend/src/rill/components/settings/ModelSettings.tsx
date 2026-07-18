import { useState } from "react";
import { Plus, Cpu, Trash2, RefreshCw, Wifi, Image as ImageIcon, Brain, Check } from "lucide-react";
import { toast } from "sonner";
import { initialVisualState, SettingsBody } from "./Settings";
import { brand } from "../../../lib/brand";
import { Section, Row, Select, SaveBar, StateBadge, StateSwitcher, ConfirmDialog, Drawer, SecretField } from "./kit";
import { providers as seedProviders, models as seedModels, type Provider } from "./data";
import { useStore } from "../../state/visualStore";

type Test = "idle" | "testing" | "ok" | "keyInvalid" | "network" | "address" | "noModel";

export function ModelSettings() {
  const { params } = useStore();
  const [providers, setProviders] = useState<Provider[]>(seedProviders);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reassign, setReassign] = useState("Sonnet 4.6");

  const [execModel, setExecModel] = useState("Opus 4.8");
  const [planModel, setPlanModel] = useState(`${brand.productName}-Plan-Pro`);
  const [subModel, setSubModel] = useState("Sonnet 4.6");
  const [reasoning, setReasoning] = useState("高");
  const [maxSteps, setMaxSteps] = useState("40");

  const [test, setTest] = useState<Test>(() => initialVisualState(params.rillVisualState, ["idle", "testing", "ok", "keyInvalid", "network", "address", "noModel"] as const, "idle"));

  const availableModels = seedModels.filter((m) => m.available).map((m) => m.name);

  const runTest = (result: Test) => {
    setTest("testing");
    setTimeout(() => {
      setTest(result);
      const map: Record<string, () => void> = {
        ok: () => toast.success("连接成功"),
        keyInvalid: () => toast.error("密钥无效", { description: "请检查 API Key（原文不会显示）" }),
        network: () => toast.error("网络失败", { description: "无法连接到服务地址" }),
        address: () => toast.error("地址错误", { description: "API 地址格式不正确" }),
        noModel: () => toast.error("模型不可用", { description: "服务未返回可用模型" }),
      };
      map[result]?.();
    }, 1000);
  };

  const save = () => { setSaving(true); setTimeout(() => { setSaving(false); setDirty(false); toast.success("模型设置已保存"); }, 800); };

  const doDelete = () => {
    const p = providers.find((x) => x.id === deleteId);
    setProviders((ps) => ps.filter((x) => x.id !== deleteId));
    setDeleteId(null);
    toast.success(`已删除「${p?.name}」`, { description: `受影响的默认模型已改用「${reassign}」` });
    setExecModel((m) => (seedModels.find((x) => x.name === m)?.providerId === deleteId ? reassign : m));
  };

  return (
    <SettingsBody title="模型" desc="接入模型服务、管理密钥与可用模型，并指定不同任务的默认模型">
      <StateSwitcher value={test} onChange={setTest} options={[{ id: "idle", label: "已配置" }, { id: "testing", label: "连接测试中" }, { id: "ok", label: "连接成功" }, { id: "keyInvalid", label: "密钥无效" }, { id: "network", label: "网络失败" }, { id: "noModel", label: "无可用模型" }]} />

      <Section title="模型服务商" desc="官方预设或 OpenAI / Anthropic 兼容的自定义服务商" actions={
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] text-white hover:bg-teal-700"><Plus className="size-4" />添加服务商</button>
      }>
        {providers.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-[13px] text-slate-400"><Cpu className="size-7 text-slate-300" /><p className="mt-2">还没有接入任何服务商</p></div>
        ) : (
          <div className="space-y-2">
            {providers.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] text-slate-900">{p.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{p.kind === "preset" ? "官方预设" : p.kind === "openai" ? "OpenAI 兼容" : "Anthropic 兼容"}</span>
                  <StateBadge state={p.state} />
                  <div className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => runTest("ok")} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Wifi className="size-3.5" />测试</button>
                    <button onClick={() => { toast.success("已获取可用模型"); setDirty(true); }} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RefreshCw className="size-3.5" />获取模型</button>
                    {p.kind !== "preset" && <button onClick={() => setDeleteId(p.id)} className="grid size-7 place-items-center rounded-lg text-rose-500 ring-1 ring-slate-200 hover:bg-rose-50"><Trash2 className="size-3.5" /></button>}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-400">
                  <span className="font-mono">{p.baseUrl}</span>
                  <span>密钥：{p.hasKey ? "已配置" : "缺少密钥"}</span>
                  <span>可用模型：{p.modelCount}</span>
                </div>
                {/* 模型列表（含能力标识） */}
                {p.modelCount > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {seedModels.filter((m) => m.providerId === p.id).map((m) => (
                      <span key={m.id} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ring-1 ${m.available ? "bg-white text-slate-600 ring-slate-200" : "bg-slate-50 text-slate-300 ring-slate-200 line-through"}`}>
                        {m.name}
                        {m.vision && <ImageIcon className="size-3 text-sky-500" />}
                        {m.reasoning && <Brain className="size-3 text-indigo-500" />}
                      </span>
                    ))}
                    <button onClick={() => toast("手动添加模型")} className="rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-400 hover:border-teal-300 hover:text-teal-600">+ 手动添加</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {test !== "idle" && (
          <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] ${test === "ok" ? "bg-emerald-50 text-emerald-700" : test === "testing" ? "bg-sky-50 text-sky-700" : "bg-rose-50 text-rose-700"}`}>
            {test === "testing" ? "正在测试连接…" : test === "ok" ? "连接成功，模型可用" : test === "keyInvalid" ? "密钥无效（原文不显示）" : test === "network" ? "网络失败：无法连接服务地址" : test === "address" ? "地址错误" : "无可用模型"}
          </div>
        )}
      </Section>

      <div className="mt-4">
        <Section title="默认模型" desc="不可选择当前不可用的模型作为默认">
          <Row label="默认执行模型"><Select value={execModel} onChange={(v) => { setExecModel(v); setDirty(true); }} options={availableModels} /></Row>
          <Row label="规划模型"><Select value={planModel} onChange={(v) => { setPlanModel(v); setDirty(true); }} options={availableModels} /></Row>
          <Row label="子智能体默认模型"><Select value={subModel} onChange={(v) => { setSubModel(v); setDirty(true); }} options={availableModels} /></Row>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="运行限制">
          <Row label="默认推理强度"><Select value={reasoning} onChange={(v) => { setReasoning(v); setDirty(true); }} options={["低", "中", "高"]} /></Row>
          <Row label="最大执行步数"><input value={maxSteps} onChange={(e) => { setMaxSteps(e.target.value); setDirty(true); }} className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-300" /></Row>
        </Section>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => { setDirty(false); toast("已放弃修改"); }} />

      {adding && (
        <Drawer title="添加自定义服务商" onClose={() => setAdding(false)} footer={
          <>
            <button onClick={() => setAdding(false)} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">取消</button>
            <button onClick={() => runTest("ok")} className="rounded-lg bg-white px-3.5 py-1.5 text-[13px] text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50">测试连接</button>
            <button onClick={() => { setProviders((ps) => [...ps, { id: `pv${Date.now()}`, name: "新服务商", kind: "openai", baseUrl: "http://…", keyEnv: "CUSTOM_API_KEY", hasKey: true, state: "connected", modelCount: 0 }]); setAdding(false); toast.success("服务商已添加"); }} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-teal-700">保存</button>
          </>
        }>
          <label className="block"><span className="text-[12px] text-slate-500">名称</span><input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300" placeholder="例如：本地推理网关" /></label>
          <label className="block"><span className="text-[12px] text-slate-500">协议类型</span>
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><option>OpenAI 兼容</option><option>Anthropic 兼容</option></select>
          </label>
          <label className="block"><span className="text-[12px] text-slate-500">API 地址（Base URL）</span><input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="https://…/v1" /></label>
          <label className="block"><span className="text-[12px] text-slate-500">完整聊天地址（可选）</span><input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="…/chat/completions" /></label>
          <label className="block"><span className="text-[12px] text-slate-500">模型发现地址（可选）</span><input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="…/models" /></label>
          <label className="block"><span className="text-[12px] text-slate-500">密钥环境变量名</span><input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-300" placeholder="CUSTOM_API_KEY" /></label>
          <SecretField hasValue={false} envName="CUSTOM_API_KEY" />
          {test === "ok" && <div className="flex items-center gap-1.5 text-[12px] text-emerald-600"><Check className="size-4" />连接测试成功</div>}
        </Drawer>
      )}

      <ConfirmDialog open={!!deleteId} title="删除服务商" onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmText="删除并改用替代">
        删除后，使用该服务商模型的默认配置将失效。请为受影响的默认模型选择替代项：
        <div className="mt-2"><Select value={reassign} onChange={setReassign} options={availableModels} /></div>
      </ConfirmDialog>
    </SettingsBody>
  );
}
