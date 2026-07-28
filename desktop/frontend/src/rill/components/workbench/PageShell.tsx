import { ArrowLeft, type LucideIcon } from "lucide-react";
import { useStore } from "../../state/visualStore";
import type { ReactNode } from "react";

export function PageShell({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { navigate } = useStore();
  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <button
          onClick={() => navigate("workbench")}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="size-4" />
          主工作台
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="grid size-8 place-items-center rounded-lg bg-teal-50 text-teal-600">
          <Icon className="size-[18px]" />
        </div>
        <div className="leading-tight">
          <h1 className="text-[15px] text-slate-900">{title}</h1>
          {subtitle && <div className="text-[11px] text-slate-400">{subtitle}</div>}
        </div>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

