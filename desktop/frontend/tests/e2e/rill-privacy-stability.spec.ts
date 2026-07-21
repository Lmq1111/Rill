import { expect, test, type Page } from "@playwright/test";

async function send(page: Page, text: string) {
  await page.locator('textarea[placeholder*="输入消息"]').fill(text);
  await page.getByRole("button", { name: /发送/ }).last().click();
}

test("Rill keeps browser surfaces local and preserves offline draft and history", async ({ page, context }) => {
  const upstreamRequests: string[] = [];
  page.on("request", (request) => {
    if (/https?:\/\/(?:[^/]+\.)?reasonix\.io(?:\/|$)/i.test(request.url())) {
      upstreamRequests.push(request.url());
    }
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("rill-live-shell")).toBeVisible();
  await page.getByRole("button", { name: "新建会话" }).click();
  const sessionNames = page.locator("aside .text-\\[13px\\]");
  await expect(sessionNames.first()).toBeVisible();
  if (await sessionNames.count() > 1) await sessionNames.nth(1).click();
  await send(page, "阶段七离线历史标记");
  await expect(page.getByText("Rill正在运行", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "停止" }).first().click();

  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "诊断", exact: true }).click();
  await expect(page.getByRole("heading", { name: "诊断", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "版本与隐私", exact: true }).click();
  await expect(page.getByRole("heading", { name: "版本与隐私", exact: true })).toBeVisible();
  await expect(page.getByText(/dl\.reasonix\.io\/plugins\/catalog\/v1\/index\.json/)).toBeVisible();
  await page.getByRole("button", { name: "返回主工作台" }).click();

  const composer = page.locator('textarea[placeholder*="输入消息"]');
  await composer.fill("网络断开时必须保留的本地草稿");
  await context.setOffline(true);
  await expect(composer).toHaveValue("网络断开时必须保留的本地草稿");
  await expect(page.getByRole("main")).toContainText("阶段七离线历史标记");
  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent("error", { message: "controlled local stage-seven error" }));
  });
  await expect(composer).toHaveValue("网络断开时必须保留的本地草稿");
  await context.setOffline(false);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("rill-live-shell")).toBeVisible();
  await expect(page.getByRole("main")).toContainText("阶段七离线历史标记");
  expect(upstreamRequests).toEqual([]);
});
