import { expect, test, type Page } from "@playwright/test";

test.describe("CUTROOM journey", () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));
    await page.goto("/");
  });

  async function openFirstBoard(page: Page): Promise<void> {
    await page.getByRole("button", { name: /^Open board / }).first().click();
    await expect(page.getByLabel(/Stage: frame \d+ of \d+/)).toBeVisible();
  }

  test("gallery seeds starters and opens the editor", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Storyboard the cut");
    await expect(page.locator("article")).toHaveCount(4);
    await openFirstBoard(page);
    await expect(page.locator(".timeline .label")).toHaveText(/Timeline/i);
    expect(consoleErrors).toEqual([]);
  });

  test("create a blank board and add a shape", async ({ page }) => {
    await page.getByRole("button", { name: "New storyboard" }).click();
    await page.getByRole("button", { name: "Create board" }).click();
    await expect(page.getByLabel(/Stage: frame \d+ of \d+/)).toBeVisible();
    await page.getByRole("button", { name: "Shape", exact: true }).click();
    await page.getByRole("menuitem", { name: "Rectangle" }).click();
    await expect(page.locator('.stage-object-hit[data-selected="true"]')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("drag an object across the stage", async ({ page }) => {
    await openFirstBoard(page);
    await page.getByRole("button", { name: "Shape", exact: true }).click();
    await page.getByRole("menuitem", { name: "Ellipse" }).click();
    const hit = page.locator('.stage-object-hit[data-selected="true"]');
    const box = (await hit.boundingBox()) as { x: number; y: number; width: number; height: number };
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 5 });
    await page.mouse.up();
    const after = (await hit.boundingBox()) as { x: number; y: number };
    expect(after.x).toBeGreaterThan(box.x + 60);
    expect(after.y).toBeGreaterThan(box.y + 20);
  });

  test("reorder frames with the keyboard, undo and redo", async ({ page }) => {
    await openFirstBoard(page);
    const durations = async () =>
      (await page.locator(".frame-card .card-meta").allTextContents())
        .map((t) => t.match(/(\d+\.\d)s$/)?.[1] ?? "")
        .join(",");
    const before = await durations();
    await page.locator(".frame-card .card-art").first().click();
    await page.keyboard.press("Control+ArrowRight");
    const after1 = await durations();
    expect(after1).not.toBe(before);
    // same-label commits inside 600ms coalesce; space the next move past the window
    await page.waitForTimeout(700);
    await page.keyboard.press("Control+ArrowRight");
    const after2 = await durations();
    expect(after2).not.toBe(after1);
    await page.waitForTimeout(700);
    await page.keyboard.press("Control+z");
    expect(await durations()).toBe(after1);
    await page.keyboard.press("Control+Shift+z");
    expect(await durations()).toBe(after2);
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    expect(await durations()).toBe(before);
  });

  test("preview plays, navigates, and closes", async ({ page }) => {
    await openFirstBoard(page);
    await page.getByRole("button", { name: "Preview the sequence" }).click();
    const dialog = page.getByRole("dialog", { name: /Preview/ });
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await page.getByRole("button", { name: "Next frame" }).click();
    await expect(page.locator(".preview-counter").first()).toContainText("02");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("edits autosave and survive a reload", async ({ page }) => {
    await openFirstBoard(page);
    const title = page.getByLabel("Board title");
    await title.fill("Persistence Probe");
    await title.blur();
    await expect(page.locator(".save-status")).toContainText("Saved", { timeout: 5000 });
    await page.reload();
    await page.getByRole("button", { name: /^Open board Persistence Probe/ }).click();
    await expect(page.getByLabel("Board title")).toHaveValue("Persistence Probe");
  });

  test("project JSON export downloads a file", async ({ page }) => {
    await openFirstBoard(page);
    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Project JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.cutroom\.json$/);
  });

  test("invalid JSON import explains itself; valid JSON round-trips", async ({ page }) => {
    await page.getByRole("button", { name: "Import JSON" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{not json"),
    });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Import failed");
    await expect(dialog).toContainText("not valid JSON");
    await page.getByRole("button", { name: "Close dialog" }).click();

    const valid = {
      schemaVersion: 1,
      id: "import-probe",
      title: "Imported board",
      aspect: "16:9",
      paper: "#efe9db",
      brief: "",
      author: "",
      frames: [{ id: "f1", background: "#f5f1e6", objects: [], caption: { text: "hello", visible: true }, notes: "", shot: "", duration: 2, transitionIn: "cut", guides: false }],
      createdAt: 1,
      updatedAt: 1,
    };
    await page.getByRole("button", { name: "Import JSON" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "good.cutroom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(valid)),
    });
    await expect(page.getByLabel("Board title")).toHaveValue("Imported board");
    await expect(page.getByLabel(/Stage: frame \d+ of \d+/)).toBeVisible();
  });

  test("no console errors across the core loop", async ({ page }) => {
    await openFirstBoard(page);
    await page.getByRole("button", { name: "Shape", exact: true }).click();
    await page.getByRole("menuitem", { name: "Rectangle" }).click();
    await page.getByRole("button", { name: "Add a text object" }).click();
    await page.getByRole("button", { name: "Preview the sequence" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Back to gallery" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
