import { expect, test } from "@playwright/test";
import { openRillVisualPage } from "./support";

// Stage-one Figma evidence is JPEG-encoded (including files with a .png suffix),
// and the 1280x800 workbench capture contains a black-frame artifact. These
// lossless Playwright baselines are the stage-four regression snapshots after
// source-parity review against the frozen Figma Make components. Stage-one
// evidence remains immutable and is audited separately.

const pages = [
  ["workbench", "01-main-workbench"],
  ["channel", "02-channel-detail"],
  ["history", "03-history"],
  ["recycle", "04-recycle-bin"],
  ["automation", "05-automation"],
  ["context", "06-context-overview"],
  ["files", "07-files"],
  ["changes", "08-changes"],
] as const;

for (const [route, file] of pages) {
  test(`${route} matches the frozen primary viewport`, async ({ page }) => {
    await openRillVisualPage(page, route, "default", 1440, 900);
    await expect(page).toHaveScreenshot(["primary", `${file}.png`], {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    });
  });

  test(`${route} matches the frozen supplemental viewport`, async ({ page }) => {
    await openRillVisualPage(page, route, "default", 1280, 800);
    await expect(page).toHaveScreenshot(["supplemental", `${file}.png`], {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    });
  });
}
