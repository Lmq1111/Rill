import { expect, test, type Page } from "@playwright/test";

async function openLive(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("rill-live-shell")).toBeVisible();
}

test("Rill history and recycle use the controlled desktop backend", async ({ page }) => {
  await openLive(page);

  await page.getByRole("button", { name: "历史记录" }).click();
  await expect(page.getByRole("heading", { name: "历史记录" })).toBeVisible();

  const historySearch = page.getByPlaceholder("搜索标题、摘要、内容索引");
  await historySearch.fill("~/projects/joyquant-sys");
  await expect(page.getByText("write the README and badges", { exact: true }).first()).toBeVisible();
  await historySearch.fill("");

  await page.locator("select").nth(0).selectOption("~/projects/joyquant-sys");
  await page.locator("select").nth(2).selectOption("local");
  await page.locator("select").nth(3).selectOption("week");
  await expect(page.getByText("write the README and badges", { exact: true }).first()).toBeVisible();
  await page.getByText("write the README and badges", { exact: true }).first().click();
  await page.getByTitle("删除（移入回收站）").click();
  await expect(page.getByText("write the README and badges", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "主工作台", exact: true }).click();
  await page.getByRole("button", { name: "回收站" }).click();
  await expect(page.getByRole("heading", { name: "回收站" })).toBeVisible();
  await page.locator("select").first().selectOption("day");
  await expect(page.getByText("write the README and badges", { exact: true }).first()).toBeVisible();
  await page.getByText("write the README and badges", { exact: true }).first().click();
  await page.getByRole("button", { name: "恢复", exact: true }).click();
  await expect(page.getByRole("heading", { name: "恢复会话" })).toBeVisible();
  await page.getByRole("button", { name: "进入历史" }).click();
  await expect(page.getByRole("heading", { name: "历史记录" })).toBeVisible();
  await expect(page.getByText("write the README and badges", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "主工作台", exact: true }).click();
  await page.getByRole("button", { name: "回收站" }).click();
  const trashTitle = page.getByText("00 Establish project development standards", { exact: true }).first();
  await expect(trashTitle).toBeVisible();
  await trashTitle.click();
  await page.getByRole("button", { name: "永久删除", exact: true }).click();
  await expect(page.getByRole("heading", { name: "永久删除会话" })).toBeVisible();
  await page.getByRole("button", { name: "确认永久删除" }).click();
  await expect(page.getByRole("heading", { name: "永久删除会话" })).toHaveCount(0);
});
