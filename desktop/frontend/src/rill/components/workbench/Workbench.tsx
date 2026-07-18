import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Conversation } from "./Conversation";
import { Composer } from "./Composer";
import { ContextPanel } from "./ContextPanel";

export function Workbench() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 text-slate-900">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <TopBar />
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40">
          <Conversation />
        </div>
        <Composer />
      </main>
      <ContextPanel />
    </div>
  );
}

