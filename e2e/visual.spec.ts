import { expect, test, type Page } from "@playwright/test";

/**
 * Pixel baselines are generated on Linux in CI so font rasterization matches.
 * Run the Visual baselines workflow with --update-snapshots to refresh them.
 */
test.skip(process.platform !== "linux", "Visual baselines are generated on Linux CI.");

test.use({ viewport: { width: 1440, height: 1000 } });

async function openNightShift(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Open board Night Shift" }).click();
  await expect(page.getByLabel(/Stage: frame \d+ of \d+/)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

test("stage renders the starter frame", async ({ page }) => {
  await openNightShift(page);
  await expect(page.locator(".stage-frame-box")).toHaveScreenshot("night-shift-stage.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.002,
  });
});

test("print sheet renders the contact sheet", async ({ page }) => {
  await openNightShift(page);
  const id = page.url().split("#/board/")[1];
  await page.goto(`/#/print/${id}`);
  await expect(page.getByLabel("Contact sheet page 1 of 1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await expect(page.locator(".print-page").first()).toHaveScreenshot("night-shift-print.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.002,
  });
});

test("welcome page renders", async ({ page }) => {
  await page.goto("/#/welcome");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("welcome-page.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.002,
  });
});
