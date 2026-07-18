import type { RillRouteKey, RillVisualState } from "../routes";

export interface RillDisplayRequest {
  readonly page: RillRouteKey;
  readonly state: RillVisualState;
}

export interface RillDisplayAdapter {
  readonly kind: "live" | "visual-test";
  readonly request: RillDisplayRequest;
}
