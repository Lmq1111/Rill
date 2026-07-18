import { expect, test } from "@playwright/test";
import { openRillVisualPage } from "./support";

const states = [
  ["workbench", "awaiting-confirmation", "01-session-awaiting-confirmation", "高权限操作"],
  ["workbench", "failure", "02-session-failure", "执行失败"],
  ["workbench", "readonly", "03-session-readonly", "只读历史会话"],
  ["workbench", "empty", "04-session-empty", "开始一个新会话"],
  ["workbench", "add-project-dialog", "05-add-project-dialog", "添加已有项目"],
  ["workbench", "composer-model-menu", "06-composer-model-menu", "Sonnet 4.6"],
  ["context", "clear-context-confirmation", "07-clear-context-confirmation", "清空上下文"],
  ["recycle", "recycle-permanent-delete-confirmation", "08-recycle-permanent-delete-confirmation", "永久删除会话"],
  ["automation", "automation-task-drawer", "09-automation-task-drawer", "新增任务"],
  ["automation", "automation-yolo-confirmation", "10-automation-yolo-confirmation", "高权限（YOLO）确认"],
] as const;

for (const [route, state, file, marker] of states) {
  test(`${state} matches the frozen interaction state`, async ({ page }) => {
    await openRillVisualPage(page, route, state, 1280, 720);
    await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();
    await expect(page).toHaveScreenshot(["states", `${file}.png`], {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    });
  });
}
