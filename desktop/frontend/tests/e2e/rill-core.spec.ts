import { expect, test, type Page } from "@playwright/test";

async function openLive(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("rill-live-shell")).toBeVisible();
}

async function send(page: Page, text: string) {
  await page.locator('textarea[placeholder*="输入消息"]').fill(text);
  await page.getByRole("button", { name: /发送/ }).last().click();
}

test("Rill stage-five core flow uses the controlled desktop backend", async ({ page }) => {
  await openLive(page);

  await page.getByRole("button", { name: "新建会话" }).click();
  const sessionNames = page.locator("aside .text-\\[13px\\]");
  await expect(sessionNames.first()).toBeVisible();
  if (await sessionNames.count() > 1) await sessionNames.nth(1).click();

  await send(page, "阶段五普通消息");
  await expect(page.getByText("Rill正在运行", { exact: false })).toBeVisible();
  await page.locator('textarea[placeholder*="输入消息"]').fill("阶段五运行中补充指令");
  await page.getByRole("button", { name: "发送补充指令" }).click();
  await expect(page.getByText("阶段五运行中补充指令", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "停止" }).first().click();
  await expect(page.getByText("Rill正在运行", { exact: false })).toHaveCount(0);

  await send(page, "/approve-preview");
  await expect(page.getByText("等待人工确认", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "允许执行" }).click();
  await send(page, "/ask-preview");
  await expect(page.getByText("Rill想向你确认", { exact: false })).toBeVisible();
  await page.locator(".bg-sky-50\\/70 button").first().click();

  await page.getByRole("button", { name: /文件/ }).first().click();
  await expect(page.getByRole("heading", { name: "文件" })).toBeVisible();
  await page.getByRole("button", { name: "README.md" }).click();
  await expect(page.getByText("Browser-dev workspace preview.")).toBeVisible();
  await page.getByText("# Rill", { exact: true }).click();
  await page.getByRole("button", { name: "加入选中片段" }).click();
  await expect(page.getByRole("main").getByText(/README\.md:1-1/)).toBeVisible();

  await page.getByRole("button", { name: /改动/ }).first().click();
  await expect(page.getByRole("heading", { name: "改动" })).toBeVisible();
  await page.getByRole("button", { name: /WorkspacePanel\.tsx/ }).click();
  await page.getByText("+new", { exact: false }).click();
  await page.getByRole("button", { name: "选中片段加入" }).click();
  await expect(page.getByRole("main").getByText(/diff:.*WorkspacePanel\.tsx/)).toBeVisible();

  await page.getByRole("button", { name: /上下文/ }).first().click();
  await page.getByRole("button", { name: "清空上下文" }).click();
  await page.getByRole("button", { name: "确认清空" }).click();
  await expect(page.getByText(/历史消息仍完整保留/)).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("rill-live-shell")).toBeVisible();
  await page.getByRole("button", { name: /上下文/ }).first().click();
  await expect(page.getByText(/模型上下文已于.*清空/)).toBeVisible();
  await page.getByRole("button", { name: "主工作台" }).click();
  await expect(page.locator("main")).toContainText("阶段五普通消息");
});

test("Rill registers a project and opens its first backend session", async ({ page }) => {
  await openLive(page);

  await page.getByRole("button", { name: "添加已有项目" }).click();
  await page.getByRole("textbox", { name: "项目名称" }).fill("阶段五真实项目");
  await page.getByRole("textbox", { name: "本地 Git 目录" }).fill("/mock/stage-five-project");
  await page.getByRole("button", { name: "添加", exact: true }).click();

  const sidebar = page.locator("aside");
  await expect(sidebar.getByText("阶段五真实项目", { exact: true })).toBeVisible();
  await expect(sidebar.getByRole("button", { name: /^New session / })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("阶段五真实项目");
  await expect(page.getByRole("main").getByText("/mock/stage-five-project", { exact: true })).toBeVisible();
});

test("Rill workbench extensions call the controlled desktop backend", async ({ page }) => {
  await openLive(page);
  const sidebar = page.locator("aside");

  await sidebar.getByRole("button", { name: /^joyquant-db / }).hover();
  await sidebar.locator('[aria-label="为joyquant-db创建隔离工作区"]').click();
  await expect(sidebar.getByText("joyquant-db·隔离", { exact: true })).toBeVisible();

  const isolatedRow = sidebar.locator("div.group.relative").filter({ hasText: /New session|新会话/ }).first();
  await isolatedRow.hover();
  await isolatedRow.getByTitle("重命名会话").click();
  await sidebar.getByRole("textbox", { name: "会话名称" }).fill("阶段五隔离验收");
  await sidebar.getByRole("textbox", { name: "会话名称" }).press("Enter");
  await expect(sidebar.getByText("阶段五隔离验收", { exact: true })).toBeVisible();

  const search = sidebar.getByPlaceholder("搜索项目或会话");
  await search.fill("joyquant-sys");
  await expect(sidebar.getByText("joyquant-sys", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("joyquant-db", { exact: true })).toHaveCount(0);
  await search.fill("");

  await page.getByTitle("斜杠命令").click();
  const commandList = page.getByRole("listbox", { name: "斜杠命令" });
  await expect(commandList.getByText("/review", { exact: true })).toBeVisible();
  await commandList.getByText("/review", { exact: true }).click();
  await page.locator('textarea[placeholder*="输入消息"]').fill("/review 阶段五真实命令执行");
  await page.getByRole("button", { name: "发送" }).last().click();
  await expect(page.getByText("/review 阶段五真实命令执行", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "停止" }).first().click();

  const renamedRow = sidebar.locator("div.group.relative").filter({ hasText: "阶段五隔离验收" });
  await renamedRow.hover();
  await renamedRow.getByTitle("关闭会话").click();
  await expect(sidebar.getByText("阶段五隔离验收", { exact: true })).toHaveCount(0);

  await sidebar.getByText("00 Establish project development standards", { exact: true }).click();
  await expect(page.getByRole("main").getByText(/第 1 轮：检查聊天滚动定位/)).toBeVisible();
  const historicalUserMessage = page.getByRole("main").locator("div.group.flex").filter({ hasText: /第 1 轮：检查聊天滚动定位/ }).first();
  await historicalUserMessage.hover();
  await page.getByTitle("回滚到此消息").first().click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("rill.mock.last-rewind"))).not.toBeNull();

  await historicalUserMessage.hover();
  await page.getByTitle("编辑并重新执行").first().click();
  await page.getByRole("textbox", { name: "编辑历史问题" }).fill("阶段五编辑后重新执行");
  await page.getByRole("button", { name: "从此处重新执行" }).click();
  await expect(page.getByText("阶段五编辑后重新执行", { exact: true })).toBeVisible();
});

test("Rill live workbench exposes startup and model availability failures", async ({ page }) => {
  await page.goto("/?mock=startup_failed", { waitUntil: "networkidle" });
  await expect(page.getByText("会话启动失败", { exact: true })).toBeVisible();

  await page.goto("/?mock=model_unavailable", { waitUntil: "networkidle" });
  await expect(page.getByRole("main").getByText("模型不可用", { exact: true }).last()).toBeVisible();
});
