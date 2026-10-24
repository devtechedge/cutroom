import { expect, test } from "@playwright/test";

test.describe("responsive", () => {
  const widths = [360, 390, 768, 1024, 1280, 1440];

  for (const width of widths) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.locator("article").first()).toBeVisible();
      const galleryOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(galleryOverflow, `gallery overflows at ${width}`).toBeLessThanOrEqual(1);
      await page.getByRole("button", { name: /^Open board / }).first().click();
      await expect(page.getByLabel(/Stage: frame \d+ of \d+/)).toBeVisible();
      await page.waitForTimeout(400);
      const editorOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(editorOverflow, `editor overflows at ${width}`).toBeLessThanOrEqual(1);
    });
  }

  test("tablet opens the inspector as a sheet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.getByRole("button", { name: /^Open board / }).first().click();
    const toggle = page.getByRole("button", { name: "Toggle inspector" });
    await expect(toggle).toBeVisible();
    const aside = page.locator("aside.inspector");
    await expect(aside).not.toHaveAttribute("data-open", "true");
    await toggle.click();
    await expect(aside).toHaveAttribute("data-open", "true");
    const box = (await aside.boundingBox()) as { x: number; width: number };
    expect(box.x + box.width).toBeGreaterThan(700);
    await page.keyboard.press("Escape");
    await expect(aside).toHaveAttribute("data-open", "false");
  });

  test("boots in the stored theme before the app script loads", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("cutroom-theme", "light");
      } catch {
        // ignore storage failures in the test shim
      }
    });
    await page.route("**/*.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(".boot-shell")).toBeVisible();
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(239, 233, 219)");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("menus support arrow keys and return focus", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Board actions" }).first();
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Rename" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("theme choice persists across reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("editor header toggles the theme directly", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Open board / }).first().click();
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("accessibility", () => {
  test("storage failure degrades to memory mode with a banner", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", {
        get: () => {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await page.goto("/");
    await expect(page.locator(".storage-banner").first()).toContainText(/memory-only|unavailable/i);
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("reduced motion plays previews without transition layers", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /^Open board / }).first().click();
    await page.getByRole("button", { name: "Preview the sequence" }).click();
    await page.getByRole("button", { name: "Next frame" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".preview-layer")).toHaveCount(0);
  });

  test("keyboard-only reaches the timeline and moves frames", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Open board / }).first().click();
    const durations = async () =>
      (await page.locator(".frame-card .card-meta").allTextContents()).map((t) => t.match(/[\d.]+s/)?.[0] ?? "").join(",");
    const before = await durations();
    // focus the current card's art button and reorder with ctrl+arrow
    await page.locator('.frame-card[data-current="true"] .card-art').focus();
    await page.keyboard.press("Control+ArrowRight");
    expect(await durations()).not.toBe(before);
    await page.keyboard.press("Control+ArrowLeft");
    expect(await durations()).toBe(before);
  });

  test("stage exposes objects to assistive tech and supports nudge", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Open board / }).first().click();
    const stage = page.getByLabel(/Stage: frame \d+ of \d+/);
    await stage.focus();
    const hits = page.locator(".stage-object-hit");
    expect(await hits.count()).toBeGreaterThan(0);
    await hits.first().press("Enter");
    await expect(page.locator('.stage-object-hit[data-selected="true"]')).toBeVisible();
    const before = await page.locator('.stage-object-hit[data-selected="true"]').getAttribute("style");
    await page.keyboard.press("ArrowRight");
    const after = await page.locator('.stage-object-hit[data-selected="true"]').getAttribute("style");
    expect(after).not.toBe(before);
    await page.keyboard.press("Delete");
    await expect(page.locator('.stage-object-hit[data-selected="true"]')).toHaveCount(0);
  });
});
