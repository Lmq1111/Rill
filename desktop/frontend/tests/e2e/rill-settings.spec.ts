import { expect, test, type Page } from "@playwright/test";

async function openSettings(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.getByTestId("rill-live-shell")).toBeVisible();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByRole("heading", { name: "通用", exact: true })).toBeVisible();
}

async function openTab(page: Page, tab: string, heading = tab) {
  await page.getByRole("button", { name: tab, exact: true }).click();
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
}

test("Rill exposes all 16 production settings pages without demo-only controls", async ({ page }) => {
  await openSettings(page);
  const pages = [
    ["通用", "通用"], ["模型", "模型"], ["机器人", "机器人"], ["MCP 与工具", "MCP 与工具"],
    ["技能", "技能"], ["子智能体", "子智能体"], ["插件", "插件"], ["记忆", "记忆"],
    ["Hooks", "Hooks"], ["诊断", "诊断"], ["快捷键", "快捷键"], ["权限", "权限"],
    ["沙箱", "沙箱"], ["网络", "网络"], ["外观", "外观"], ["版本与隐私", "版本与隐私"],
  ] as const;
  for (const [tab, heading] of pages) await openTab(page, tab, heading);
  await expect(page.getByText("演示状态：")).toHaveCount(0);
  await expect(page.getByText(/阶段七完成前/)).toHaveCount(0);
});

test("Rill settings save through authoritative backend mutations and survive page reload", async ({ page }) => {
  await openSettings(page);

  await page.locator("select").first().selectOption({ label: "English" });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("设置已保存", { exact: true })).toBeVisible();
  await openTab(page, "模型");
  await openTab(page, "通用");
  await expect(page.locator("select").first()).toHaveValue("English");

  await openTab(page, "权限");
  await page.locator("select").first().selectOption({ label: "按风险询问" });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("权限设置已保存并由后端重新读取", { exact: true })).toBeVisible();
  await openTab(page, "沙箱");
  await openTab(page, "权限");
  await expect(page.locator("select").first()).toHaveValue("按风险询问");

  await openTab(page, "外观");
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("外观设置已保存", { exact: true })).toBeVisible();
  await openTab(page, "网络");
  await openTab(page, "外观");
  await expect(page.getByRole("button", { name: "深色", exact: true })).toHaveAttribute("aria-pressed", "true");

  await openTab(page, "Hooks");
  const hookCard = page.locator("div.rounded-lg.border.border-slate-200.p-3").filter({ hasText: "Notify after each turn" }).first();
  const toggle = hookCard.locator("button.relative.h-6");
  await toggle.click();
  await openTab(page, "诊断");
  await openTab(page, "Hooks");
  await expect(page.locator("div.rounded-lg.border.border-slate-200.p-3").filter({ hasText: "Notify after each turn" })).toBeVisible();

  await openTab(page, "MCP 与工具");
  await page.getByRole("button", { name: "新增 Server" }).click();
  await expect(page.getByText("JSON 导入", { exact: true })).toHaveCount(0);
  await expect(page.getByText("工作目录 / 认证信息", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "校验配置", exact: true })).toHaveCount(0);
});

test("failed settings writes retain the last backend-confirmed snapshot", async ({ page }) => {
  await openSettings(page, "/?mock=settings_write_failed");
  await page.locator("select").first().selectOption({ label: "English" });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("controlled settings write failure");
  await openTab(page, "模型");
  await openTab(page, "通用");
  await expect(page.locator("select").first()).toHaveValue("简体中文");
});
