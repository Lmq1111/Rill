import { expect, test } from "@playwright/test";
import { openRillVisualPage } from "./support";

const pages = [
  ["settings-general", "09-settings-general", "通用"],
  ["settings-model", "10-settings-model", "模型"],
  ["settings-bot", "11-settings-bot", "机器人"],
  ["settings-mcp", "12-settings-mcp-tools", "MCP 与工具"],
  ["settings-skills", "13-settings-skills", "技能"],
  ["settings-subagents", "14-settings-subagents", "子智能体"],
  ["settings-plugins", "15-settings-plugins", "插件"],
  ["settings-memory", "16-settings-memory", "记忆"],
] as const;

for (const [route, file, heading] of pages) {
  test(`${route} matches the frozen primary viewport`, async ({ page }) => {
    await openRillVisualPage(page, route, "default", 1440, 900);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot(["primary", `${file}.png`], {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    });
  });

  test(`${route} matches the frozen supplemental viewport`, async ({ page }) => {
    await openRillVisualPage(page, route, "default", 1280, 800);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot(["supplemental", `${file}.png`], {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    });
  });
}

const stateCases = [
  ["settings-general", "loading", "加载中"],
  ["settings-general", "running", "运行中（不可修改）"],
  ["settings-model", "keyInvalid", "密钥无效"],
  ["settings-mcp", "authExpired", "认证过期"],
  ["settings-skills", "scanning", "扫描中"],
  ["settings-subagents", "failed", "试运行失败"],
  ["settings-plugins", "installing", "安装中"],
  ["settings-memory", "empty", "无记忆"],
] as const;

for (const [route, state, selectedLabel] of stateCases) {
  test(`${route} exposes the frozen ${state} state through the deterministic query`, async ({ page }) => {
    await openRillVisualPage(page, route, state, 1280, 800);
    await expect(page.getByRole("button", { name: selectedLabel, exact: true })).toHaveAttribute("aria-pressed", "true");
  });
}
