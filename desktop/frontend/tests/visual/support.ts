import { expect, type Page } from "@playwright/test";

export async function openRillVisualPage(
  page: Page,
  route: string,
  state: string,
  width: number,
  height: number,
) {
  await page.setViewportSize({ width, height });
  await page.goto(`/?rill-page=${route}&rill-state=${state}`, { waitUntil: "networkidle" });
  const shell = page.getByTestId("rill-visual-shell");
  await expect(shell).toHaveAttribute("data-rill-page", route);
  await expect(shell).toHaveAttribute("data-rill-state", state);
  await page.evaluate(() => {
    const shadow = document.querySelector("#root")?.shadowRoot;
    if (!shadow || shadow.querySelector("style[data-rill-visual-freeze]")) return;
    const style = document.createElement("style");
    style.dataset.rillVisualFreeze = "true";
    style.textContent = "*,*::before,*::after{animation-delay:0s!important;animation-duration:0s!important;caret-color:transparent!important;transition:none!important}";
    shadow.append(style);
  });
  await page.evaluate(() => document.fonts.ready);
}
