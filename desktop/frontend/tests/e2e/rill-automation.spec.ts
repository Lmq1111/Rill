import { expect, test, type Locator, type Page } from "@playwright/test";

async function openAutomation(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("rill-live-shell")).toBeVisible();
  await page.getByRole("button", { name: "自动化任务" }).click();
  await expect(page.getByRole("heading", { name: "自动化任务" })).toBeVisible();
}

function taskCard(page: Page, name: string): Locator {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

test("Rill automation persists schedules and delegates edit, toggle, run/reuse, and delete", async ({ page }) => {
  await openAutomation(page);
  await page.getByRole("button", { name: "新增任务" }).click();
  const editor = page.getByTestId("rill-automation-editor");
  await editor.getByLabel("任务名称").fill("阶段六月末巡检");
  await editor.getByLabel("任务提示词").fill("检查月末构建与发布状态");
  const projectValues = await editor.getByLabel("作用范围").locator("option:not([value='全局'])").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
  );
  await editor.getByLabel("作用范围").selectOption(projectValues[0]);
  await editor.getByLabel("执行频率").selectOption("monthly");
  await editor.getByLabel("日期").selectOption("31");
  await editor.getByLabel("时间").fill("10:15");
  await editor.getByLabel("时区").selectOption("UTC-8 (America/Los_Angeles)");
  await editor.getByText("Auto", { exact: true }).click();

  const push = editor.getByLabel("推送到机器人渠道");
  if (await editor.getByLabel("推送渠道").count().catch(() => 0) === 0) await push.check();
  if (await editor.getByLabel("推送渠道").count()) {
    const channelValues = await editor.getByLabel("推送渠道").locator("option:not([value=''])").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
    );
    if (channelValues.length > 0) await editor.getByLabel("推送渠道").selectOption(channelValues[0]);
  }
  await editor.getByRole("button", { name: "保存", exact: true }).click();
  await expect(editor).toHaveCount(0);

  let card = taskCard(page, "阶段六月末巡检");
  await expect(card.getByText("周期：每月 31 号 10:15", { exact: true })).toBeVisible();
  await expect(card.getByText("时区：UTC-8 (America/Los_Angeles)", { exact: true })).toBeVisible();

  await card.getByRole("button", { name: "编辑" }).click();
  await editor.getByLabel("执行频率").selectOption("biweekly");
  await editor.getByLabel("星期").selectOption("周三");
  await editor.getByLabel("双周起始周").fill("2026-07-20");
  await editor.getByLabel("时间").fill("09:45");
  await editor.getByLabel("时区").selectOption("UTC+0 (UTC)");
  await editor.getByLabel("会话策略").selectOption("reuse");
  await editor.getByRole("button", { name: "保存", exact: true }).click();
  await expect(editor).toHaveCount(0);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "自动化任务" }).click();
  card = taskCard(page, "阶段六月末巡检");
  await expect(card.getByText("周期：每两周 周三 09:45", { exact: true })).toBeVisible();
  await expect(card.getByText("时区：UTC+0 (UTC)", { exact: true })).toBeVisible();
  await expect(card.getByText("会话：复用同一会话", { exact: true })).toBeVisible();

  await card.getByRole("button", { name: "立即运行" }).click();
  await expect(page.getByText("「阶段六月末巡检」已提交运行", { exact: true })).toBeVisible();
  card = taskCard(page, "阶段六月末巡检");
  await expect(card.getByRole("button", { name: "打开会话" })).toBeVisible();
  await card.getByRole("button", { name: "打开会话" }).click();
  await expect(page.getByRole("button", { name: "主工作台", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "自动化任务" }).click();
  card = taskCard(page, "阶段六月末巡检");
  await card.getByRole("button", { name: "停用" }).click();
  await expect(card.getByRole("button", { name: "启用" })).toBeVisible();
  await card.getByRole("button", { name: "启用" }).click();
  await expect(card.getByRole("button", { name: "停用" })).toBeVisible();

  await card.getByRole("button", { name: "删除" }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText("阶段六月末巡检", { exact: true })).toHaveCount(0);
});

test("Rill automation blocks biweekly save until a start week is selected", async ({ page }) => {
  await openAutomation(page);
  await page.getByRole("button", { name: "新增任务" }).click();
  const editor = page.getByTestId("rill-automation-editor");
  await editor.getByLabel("任务名称").fill("双周必填校验");
  await editor.getByLabel("任务提示词").fill("验证双周起始周");
  await editor.getByLabel("执行频率").selectOption("biweekly");
  await editor.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("双周任务必须选择起始周", { exact: true })).toBeVisible();
  await expect(editor).toBeVisible();
});

test("Rill automation exposes a persisted failure and retries through the backend", async ({ page }) => {
  await openAutomation(page);
  await page.getByRole("button", { name: "新增任务" }).click();
  const editor = page.getByTestId("rill-automation-editor");
  await editor.getByLabel("任务名称").fill("失败重试验收");
  await editor.getByLabel("任务提示词").fill("[fail-once] 验证失败后的后端重试");
  await editor.getByRole("button", { name: "保存", exact: true }).click();

  let card = taskCard(page, "失败重试验收");
  await card.getByRole("button", { name: "立即运行" }).click();
  await expect(page.getByText("自动化任务运行失败，可重试", { exact: true })).toBeVisible();
  card = taskCard(page, "失败重试验收");
  await expect(card.getByText("最近错误：controlled transient heartbeat failure", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "重试" })).toBeVisible();

  await card.getByRole("button", { name: "重试" }).click();
  await expect(page.getByText("「失败重试验收」已提交运行", { exact: true })).toBeVisible();
  await expect(taskCard(page, "失败重试验收").getByRole("button", { name: "立即运行" })).toBeVisible();
});
