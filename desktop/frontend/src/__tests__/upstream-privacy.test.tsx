// Run: tsx src/__tests__/upstream-privacy.test.tsx

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { UpdateBanner } from "../components/UpdateBanner";
import { app } from "../lib/bridge";
import { LocaleProvider } from "../lib/i18n";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.CustomEvent = dom.window.CustomEvent;

let checks = 0;
app.CheckUpdate = async () => {
  checks += 1;
  return null;
};

const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(<LocaleProvider><UpdateBanner enabled /></LocaleProvider>);
});
await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
assert.equal(checks, 0, "UpdateBanner must not perform a background update check");
assert.equal(document.body.textContent?.trim(), "", "disabled updater banner must render nothing");

const updateBanner = readFileSync(new URL("../components/UpdateBanner.tsx", import.meta.url), "utf8");
assert.doesNotMatch(updateBanner, /useUpdater|\bcheck\s*\(/, "UpdateBanner source must not retain an updater side effect");

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
assert.doesNotMatch(appSource, /<UpdateBanner\b|startupUpdateChecksEnabled/, "App must not retain a background updater reachability path");

const liveAbout = readFileSync(new URL("../rill/components/settings/live/LiveAboutSettings.tsx", import.meta.url), "utf8");
assert.doesNotMatch(liveAbout, /SetDesktop(?:CheckUpdates|Telemetry|Metrics)/, "Rill privacy page must not expose upstream enable toggles");

const classicSettings = readFileSync(new URL("../components/SettingsPanel.tsx", import.meta.url), "utf8");
assert.doesNotMatch(classicSettings, /app\.SetDesktop(?:CheckUpdates|Telemetry|Metrics)/, "classic settings must not expose upstream enable toggles");

const networkSettings = readFileSync(new URL("../rill/components/settings/NetworkSettings.tsx", import.meta.url), "utf8");
assert.doesNotMatch(networkSettings, /CheckUpdate/, "network settings must not treat the disabled updater as a connectivity probe");

await act(async () => root.unmount());
process.stdout.write("upstream privacy tests passed\n");
