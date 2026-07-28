import { expect, test } from "@playwright/test";
import { openRillVisualPage } from "./support";

const pages = [
  ["settings-hooks", "17-settings-hooks", "Hooks"],
  ["settings-diagnostics", "18-settings-diagnostics", "诊断"],
  ["settings-keyboard", "19-settings-keyboard", "快捷键"],
  ["settings-permissions", "20-settings-permissions", "权限"],
  ["settings-sandbox", "21-settings-sandbox", "沙箱"],
  ["settings-network", "22-settings-network", "网络"],
  ["settings-appearance", "23-settings-appearance", "外观"],
  ["settings-about-privacy", "24-settings-about-privacy", "版本与隐私"],
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
  ["settings-hooks", "empty", "无 Hook"],
  ["settings-diagnostics", "idle", "未诊断"],
  ["settings-permissions", "conflict", "规则冲突"],
  ["settings-sandbox", "unavailable", "后端不可用"],
  ["settings-network", "manual", "手动配置"],
  ["settings-appearance", "dark", "深色"],
  ["settings-about-privacy", "offline", "离线"],
] as const;

for (const [route, state, selectedLabel] of stateCases) {
  test(`${route} exposes the frozen ${state} state through the deterministic query`, async ({ page }) => {
    await openRillVisualPage(page, route, state, 1280, 800);
    await expect(page.getByRole("button", { name: selectedLabel, exact: true })).toHaveAttribute("aria-pressed", "true");
  });
}
