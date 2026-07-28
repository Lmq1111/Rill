import { defineConfig } from "@playwright/test";

const baseURL = process.env.RILL_VISUAL_BASE_URL || "http://127.0.0.1:5174";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  snapshotPathTemplate: "{testDir}/visual/baselines/{arg}{ext}",
  use: {
    baseURL,
    browserName: "chromium",
    channel: process.env.RILL_PLAYWRIGHT_CHANNEL || undefined,
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
  },
  webServer: {
    command: "RILLAGENT_DESKTOP_VITE_PORT=5174 pnpm dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
