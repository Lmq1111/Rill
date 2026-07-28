import type { RillDisplayAdapter } from "./types";
import type { RillVisualRequest } from "../routes";

export function createVisualRillAdapter(request: RillVisualRequest): RillDisplayAdapter {
  return Object.freeze({ kind: "visual-test", request: Object.freeze({ ...request }) });
}
