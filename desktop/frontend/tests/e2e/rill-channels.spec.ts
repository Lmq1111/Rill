import { expect, test, type Page } from "@playwright/test";

async function openChannel(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("rill-live-shell")).toBeVisible();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "机器人", exact: true }).click();
  await page.getByRole("button", { name: "查看某个渠道的运行详情" }).click();
  await expect(page.getByRole("heading", { name: "消息渠道详情" })).toBeVisible();
}

test("Rill channel detail persists real bot settings without exposing secrets", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new DOMException("denied", "NotAllowedError"); } },
    });
    document.execCommand = () => false;
  });
  await openChannel(page);

  await page.getByRole("button", { name: "复制远端标识" }).click();
  await expect(page.getByText("复制失败", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "机器人设置", exact: true }).click();
  const dialog = page.getByTestId("rill-channel-settings");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("连接名称").fill("Rill 阶段六验收渠道");

  const project = dialog.getByText("项目路径").locator("select");
  const projectOptions = await project.locator("option:not([value=''])").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
  if (projectOptions.length > 0) await project.selectOption(projectOptions[0]);

  await dialog.getByPlaceholder("输入用户 ID").fill("ou_stage6_user");
  await dialog.getByRole("button", { name: "添加成员" }).click();
  await dialog.getByPlaceholder("输入用户 ID").fill("ou_stage6_user");
  await dialog.getByRole("button", { name: "添加成员" }).click();
  await dialog.getByPlaceholder("输入群组 ID").fill("oc_stage6_group");
  await dialog.getByRole("button", { name: "添加群组" }).click();
  await dialog.getByRole("button", { name: "保存设置" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Rill 阶段六验收渠道", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/2 位用户 · 1 个群组/)).toBeVisible();

  await page.getByRole("button", { name: "机器人设置", exact: true }).click();
  const secret = "stage6-secret-must-not-render";
  await dialog.getByPlaceholder("输入新密钥或 Token").fill(secret);
  await dialog.getByRole("button", { name: "安全更新" }).click();
  await expect(page.getByText("凭证已安全更新", { exact: true })).toBeVisible();
  await expect(dialog.getByPlaceholder("输入新密钥或 Token")).toHaveValue("");
  await expect(page.getByText(secret, { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "关闭机器人设置" }).click();

  await page.getByRole("button", { name: "重新连接", exact: true }).last().click();
  await expect(page.getByText("已请求重新连接", { exact: true })).toBeVisible();
});
