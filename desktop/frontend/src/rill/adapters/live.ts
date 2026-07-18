import type { RillDisplayAdapter } from "./types";

// Stage four establishes the display boundary without duplicating backend
// authority in frontend state. Real controller/Wails mapping starts in stage
// five; until then the production application keeps its existing live shell.
export const liveRillAdapter = Object.freeze({
  kind: "live",
  request: { page: "workbench", state: "default" },
} as const) satisfies RillDisplayAdapter;
