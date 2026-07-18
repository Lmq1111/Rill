import { Toaster } from "sonner";
import type { RillDisplayAdapter } from "./adapters/types";
import { RillVisualShell } from "./layouts/RillVisualShell";
import { CorePages } from "./pages/core";
import { StoreProvider, type Route, type Session, type VisualStoreSeed } from "./state/visualStore";
import figmaCss from "./rill.css?inline";
import tokensCss from "./tokens.css?inline";

// The frozen Figma Make bundle is injected into a ShadowRoot so its preflight
// and utility selectors cannot mutate the production application stylesheet.
export const rillVisualCss = `${figmaCss}\n${tokensCss}`;

const coreRoute = new Set(Object.keys(CorePages));

const emptySessionPatch: Partial<Session> = {
  title: "新会话",
  summary: "空会话，尚未开始对话。",
  runState: "empty",
  updatedAt: "刚刚",
  createdAt: "刚刚",
  draft: "",
  attachments: [],
  refs: [],
  messages: [],
  context: {
    used: 0,
    limit: 200000,
    rounds: 0,
    roundTokens: 0,
    cacheHit: 0,
    cacheMiss: 0,
    roundCost: 0,
    totalCost: 0,
    currency: "USD",
    balance: 42.5,
    refreshedAt: "刚刚",
  },
};

export function createRillVisualSeed(page: string, state: string): VisualStoreSeed {
  const route: Route = coreRoute.has(page) ? (page as Route) : "workbench";
  const emptyLike = state === "empty" || state === "add-project-dialog" || state === "composer-model-menu";
  const activeSessionId =
    state === "awaiting-confirmation" ? "s2" :
      state === "failure" ? "s7" :
        state === "readonly" ? "s5" :
          state === "normal" ? "s3" : "s1";
  return {
    route,
    activeSessionId,
    params: { rillVisualState: state },
    activeSessionPatch: emptyLike ? emptySessionPatch : state === "loading" ? { runState: "loading" } : undefined,
  };
}

export function RillVisualApp({ adapter }: { adapter: RillDisplayAdapter }) {
  if (adapter.kind !== "visual-test") throw new Error("Rill visual app requires the development-only visual adapter");
  const { request } = adapter;
  const Page = CorePages[request.page as keyof typeof CorePages] ?? CorePages.workbench;

  return (
    <RillVisualShell request={request}>
      <StoreProvider seed={createRillVisualSeed(request.page, request.state)}>
        <Page />
        <Toaster position="bottom-right" richColors />
      </StoreProvider>
    </RillVisualShell>
  );
}
