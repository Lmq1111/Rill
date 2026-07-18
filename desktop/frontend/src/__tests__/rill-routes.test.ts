import { deepEqual, equal, ok } from "node:assert/strict";
import {
  RILL_ROUTES,
  isRillRouteKey,
  parseRillVisualRequest,
  type RillRouteKey,
} from "../rill/routes";

const expectedRoutes: RillRouteKey[] = [
  "workbench",
  "channel",
  "history",
  "recycle",
  "automation",
  "context",
  "files",
  "changes",
  "settings-general",
  "settings-model",
  "settings-bot",
  "settings-mcp",
  "settings-skills",
  "settings-subagents",
  "settings-plugins",
  "settings-memory",
  "settings-hooks",
  "settings-diagnostics",
  "settings-keyboard",
  "settings-permissions",
  "settings-sandbox",
  "settings-network",
  "settings-appearance",
  "settings-about-privacy",
];

deepEqual(RILL_ROUTES.map((route) => route.key), expectedRoutes, "Rill exposes the frozen 24-page route order");
equal(new Set(RILL_ROUTES.map((route) => route.key)).size, 24, "Rill route keys are unique");
ok(RILL_ROUTES.every((route) => route.figma === "FIGMA_LOCKED"), "all 24 page bodies stay Figma locked");

for (const route of expectedRoutes) {
  ok(isRillRouteKey(route), `${route} is recognized as a stable route`);
}
equal(isRillRouteKey("settings-release"), false, "unknown routes are rejected");

deepEqual(
  parseRillVisualRequest("?rill-page=files&rill-state=empty", true),
  { page: "files", state: "empty" },
  "development visual requests are deterministic",
);
equal(parseRillVisualRequest("?rill-page=files", false), null, "production builds reject the mock visual entry");
equal(parseRillVisualRequest("?rill-page=unknown", true), null, "unknown pages never reach the visual adapter");
