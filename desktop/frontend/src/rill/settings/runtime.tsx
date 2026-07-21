import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppBindings } from "../../lib/bridge";
import type {
  CapabilityDiagnosticsReport,
  HooksSettingsView,
  MemoryView,
  PluginView,
  ServerView,
  SettingsView,
  SkillsSettingsView,
} from "../../lib/types";

export type RillSettingsBackend = Pick<AppBindings,
  | "Settings"
  | "MCPServers"
  | "SkillsSettings"
  | "Plugins"
  | "Memory"
  | "HooksSettings"
  | "CapabilityDiagnostics"
> & Partial<AppBindings>;

export interface RillSettingsSnapshot {
  settings: SettingsView;
  servers: ServerView[];
  skills: SkillsSettingsView;
  plugins: PluginView[];
  memory: MemoryView;
  hooks: HooksSettingsView;
  diagnostics: CapabilityDiagnosticsReport;
}

export interface RillSettingsContextValue {
  backend: RillSettingsBackend;
  snapshot: RillSettingsSnapshot | null;
  loading: boolean;
  saving: boolean;
  error: string;
  reload: () => Promise<boolean>;
  apply: (label: string, mutation: () => Promise<unknown>) => Promise<boolean>;
}

const SettingsContext = createContext<RillSettingsContextValue | null>(null);

function messageOf(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}

async function readSnapshot(backend: RillSettingsBackend): Promise<RillSettingsSnapshot> {
  const [settings, servers, skills, plugins, memory, hooks, diagnostics] = await Promise.all([
    backend.Settings(),
    backend.MCPServers(),
    backend.SkillsSettings(),
    backend.Plugins(),
    backend.Memory(),
    backend.HooksSettings("global"),
    backend.CapabilityDiagnostics(false),
  ]);
  return {
    settings,
    servers: Array.isArray(servers) ? servers : [],
    skills,
    plugins: Array.isArray(plugins) ? plugins : [],
    memory,
    hooks,
    diagnostics,
  };
}

export function RillSettingsProvider({ backend, children }: { backend: RillSettingsBackend; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<RillSettingsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    // React StrictMode deliberately runs an extra setup/cleanup/setup cycle in
    // development. Resetting the flag in setup keeps the second live mount able
    // to publish the backend snapshot instead of remaining on "loading" forever.
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await readSnapshot(backend);
      if (mounted.current) {
        setSnapshot(next);
        setError("");
      }
      return true;
    } catch (cause) {
      if (mounted.current) setError(messageOf(cause, "设置读取失败"));
      return false;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [backend]);

  useEffect(() => { void reload(); }, [reload]);

  const apply = useCallback(async (label: string, mutation: () => Promise<unknown>) => {
    setSaving(true);
    setError("");
    try {
      await mutation();
      const next = await readSnapshot(backend);
      if (mounted.current) setSnapshot(next);
      return true;
    } catch (cause) {
      if (mounted.current) setError(messageOf(cause, `${label}失败`));
      return false;
    } finally {
      if (mounted.current) setSaving(false);
    }
  }, [backend]);

  const value = useMemo<RillSettingsContextValue>(() => ({
    backend,
    snapshot,
    loading,
    saving,
    error,
    reload,
    apply,
  }), [apply, backend, error, loading, reload, saving, snapshot]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useRillSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useRillSettings must be used within RillSettingsProvider");
  return value;
}

export function useRillSettingsOptional() {
  return useContext(SettingsContext);
}
