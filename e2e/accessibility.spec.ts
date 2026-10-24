import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
}

test("gallery passes axe", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await seriousViolations(page), "gallery").toEqual([]);
});

test("mobile gallery and editor pass axe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await seriousViolations(page), "mobile gallery").toEqual([]);
  await page.getByRole("button", { name: /^Open board / }).first().click();
  await expect(page.getByLabel(/Stage: frame \d+ of \d+/)).toBeVisible();
  expect(await seriousViolations(page), "mobile editor").toEqual([]);
});

test("editor, menus, dialogs, and preview pass axe", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Open board / }).first().click();
  await expect(page.getByLabel(/Stage: frame \d+ of \d+/)).toBeVisible();
  expect(await seriousViolations(page), "editor dark").toEqual([]);

  await page.getByRole("button", { name: "Board menu" }).click();
  expect(await seriousViolations(page), "board menu").toEqual([]);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  expect(await seriousViolations(page), "editor light").toEqual([]);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();

  await page.getByRole("button", { name: "Back to gallery" }).click();
  await page.getByRole("button", { name: "New storyboard" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await seriousViolations(page), "new board dialog").toEqual([]);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /^Open board / }).first().click();
  await page.getByRole("button", { name: "Preview the sequence" }).click();
  await expect(page.getByRole("dialog", { name: /Preview/ })).toBeVisible();
  expect(await seriousViolations(page), "preview").toEqual([]);
});
