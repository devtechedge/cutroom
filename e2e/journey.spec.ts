import fs from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
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

  async function addPixelImage(page: Page): Promise<void> {
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /^Add an image/ }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "pixel.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(page.locator("svg[aria-label^=\"Frame\"] image")).toHaveCount(1);
  }

  test("gallery seeds starters and opens the editor", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Storyboard the cut");
    await expect(page.locator("article")).toHaveCount(4);
    await openFirstBoard(page);
    await expect(page.locator(".timeline .label")).toHaveText(/Timeline/i);
    expect(consoleErrors).toEqual([]);
  });

  test("deleting every board stays empty after reload and can restore starters", async ({ page }) => {
    await expect(page.locator("article.board-card")).toHaveCount(4);
    for (let remaining = 3; remaining >= 0; remaining -= 1) {
      const card = page.locator("article.board-card").first();
      await card.getByRole("button", { name: "Board actions" }).click();
      await page.getByRole("menuitem", { name: "Delete board" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete board" }).click();
      await expect(page.locator("article.board-card")).toHaveCount(remaining);
    }
    await expect(page.getByText("No boards yet.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("No boards yet.")).toBeVisible();
    await expect(page.locator("article.board-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Restore starter boards" }).click();
    await expect(page.locator("article.board-card")).toHaveCount(4);
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
    await expect(page.getByLabel("Board title")).toHaveValue("Persistence Probe");
  });

  test("board route restores on reload and Back returns to the gallery", async ({ page }) => {
    await openFirstBoard(page);
    expect(page.url()).toContain("#/board/");
    await page.reload();
    await expect(page.getByLabel("Board title")).toBeVisible();
    await page.getByRole("button", { name: "Back to gallery" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(page.url()).not.toContain("#/board/");
  });

  test("missing board routes fall back to the gallery", async ({ page }) => {
    await page.goto("/#/board/missing-board");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(() => page.url()).not.toContain("missing-board");
  });

  test("a second tab warns when the same board is open", async ({ page, context }) => {
    await openFirstBoard(page);
    const other = await context.newPage();
    await other.goto(page.url());
    await expect(page.locator(".toast")).toContainText("another tab");
    await other.close();
  });

  test("project JSON export downloads a file", async ({ page }) => {
    await openFirstBoard(page);
    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Project JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.cutroom\.json$/);
  });

  test("project JSON carries uploaded images into a fresh profile", async ({ page, browser }) => {

    await openFirstBoard(page);
    const boardTitle = await page.getByLabel("Board title").inputValue();
    await addPixelImage(page);

    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Project JSON" }).click();
    const download = await downloadPromise;
    const jsonPath = await download.path();
    const file = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
      schemaVersion: number;
      assets: { dataUrl: string }[];
    };
    expect(file.schemaVersion).toBe(2);
    expect(file.assets).toHaveLength(1);
    expect(file.assets[0].dataUrl).toMatch(/^data:image\/png;base64,/);

    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await freshPage.goto(new URL(page.url()).origin);
    await freshPage.locator('input[type="file"][accept*="json"]').setInputFiles(jsonPath);
    await expect(freshPage.getByLabel("Board title")).toHaveValue(boardTitle);
    await expect(freshPage.locator("svg[aria-label^=\"Frame\"] image")).toHaveCount(1);
    await expect(freshPage.getByText("Image missing")).toHaveCount(0);
    await fresh.close();
  });

  test("gallery JSON export includes uploaded images", async ({ page }) => {
    await openFirstBoard(page);
    const boardTitle = await page.getByLabel("Board title").inputValue();
    await addPixelImage(page);
    await page.getByRole("button", { name: "Back to gallery" }).click();
    const card = page.locator("article.board-card").filter({ has: page.getByRole("heading", { name: boardTitle, exact: true }) });
    await expect(card).toHaveCount(1);
    await card.getByRole("button", { name: "Board actions" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Export project JSON" }).click();
    const download = await downloadPromise;
    const file = JSON.parse(fs.readFileSync(await download.path(), "utf8")) as {
      schemaVersion: number;
      assets: { dataUrl: string }[];
    };
    expect(file.schemaVersion).toBe(2);
    expect(file.assets).toHaveLength(1);
    expect(file.assets[0].dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  test("SVG contact sheet is valid XML and opens", async ({ page, browser }) => {
    await openFirstBoard(page);
    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Contact sheet (SVG)" }).click();
    const download = await downloadPromise;
    const svgPath = await download.path();
    const svg = fs.readFileSync(svgPath, "utf8");
    expect(svg).not.toContain("\u2014");
    expect(svg).toContain("font-family=");
    const parsed = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      return {
        parserError: Boolean(doc.querySelector("parsererror")),
        textLength: doc.documentElement.textContent.length,
      };
    }, svg);
    expect(parsed.parserError).toBe(false);
    expect(parsed.textLength).toBeGreaterThan(0);

    const svgContext = await browser.newContext();
    const svgPage = await svgContext.newPage();
    await svgPage.setContent(`<img id="sheet" alt="contact sheet" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`);
    await svgPage.waitForFunction(() => (document.getElementById("sheet") as HTMLImageElement).complete);
    const loaded = await svgPage.evaluate(() => {
      const image = document.getElementById("sheet") as HTMLImageElement;
      return image.naturalWidth > 0;
    });
    expect(loaded).toBe(true);
    await svgContext.close();
  });

  test("PNG contact sheet exports with loaded fonts", async ({ page }) => {
    await openFirstBoard(page);
    const fontsLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some((face) => face.family.includes("Space Grotesk") && face.status === "loaded");
    });
    expect(fontsLoaded).toBe(true);
    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Contact sheet (PNG)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/contact-sheet.*\.png$/);
    const png = fs.readFileSync(await download.path());
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  test("multi-page contact sheets download one ZIP", async ({ page }) => {
    await openFirstBoard(page);
    for (let i = 0; i < 3; i += 1) {
      await page.locator('.frame-card[data-current="true"]').getByRole("button", { name: /^Duplicate frame/ }).click();
    }
    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Contact sheet (SVG)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/contact-sheet.*\.zip$/);
    const files = unzipSync(new Uint8Array(fs.readFileSync(await download.path())));
    const names = Object.keys(files);
    expect(names).toHaveLength(2);
    expect(names.every((name) => name.endsWith(".svg"))).toBe(true);
    const first = strFromU8(files[names[0]]);
    expect(first).toContain("<svg");
    expect(first).not.toContain("\u2014");
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

  test("oversized project imports fail with the right message", async ({ page }) => {
    await page.getByRole("button", { name: "Import JSON" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "huge.cutroom.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(25 * 1024 * 1024 + 1, 0x20),
    });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Import failed");
    await expect(dialog).toContainText("larger than 25 MB");
    await page.getByRole("button", { name: "Close dialog" }).click();
  });

  test("multi-select copies, pastes and duplicates a group", async ({ page }) => {
    await openFirstBoard(page);
    const stage = page.getByLabel(/Stage: frame \d+ of \d+/);
    await stage.focus();
    const hits = page.locator(".stage-object-hit");
    const total = await hits.count();
    await page.keyboard.press("Control+a");
    await expect(page.locator('.stage-object-hit[data-selected="true"]')).toHaveCount(total);
    await expect(page.getByRole("toolbar", { name: "Selection actions" })).toBeVisible();

    const first = hits.first();
    await first.click({ modifiers: ["Shift"] });
    await expect(page.locator('.stage-object-hit[data-selected="true"]')).toHaveCount(total - 1);
    await first.click({ modifiers: ["Shift"] });
    await expect(page.locator('.stage-object-hit[data-selected="true"]')).toHaveCount(total);

    await stage.focus();
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    await expect(hits).toHaveCount(total * 2);
    await expect(page.locator('.stage-object-hit[data-selected="true"]')).toHaveCount(total);

    await page.keyboard.press("Control+d");
    await expect(hits).toHaveCount(total * 3);
    await page.keyboard.press("Delete");
    await expect(hits).toHaveCount(total * 2);
  });

  test("print route renders the contact sheet", async ({ page }) => {
    await openFirstBoard(page);
    await page.getByRole("button", { name: "Export" }).click();
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("menuitem", { name: "Print / save as PDF" }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/#\/print\//);
    await expect(popup.getByLabel("Contact sheet page 1 of 1")).toBeVisible();
    await expect(popup.locator(".print-cell")).not.toHaveCount(0);
    await expect(popup.getByRole("button", { name: "Print / save as PDF" })).toBeVisible();
    await popup.emulateMedia({ media: "print" });
    await expect(popup.locator(".print-toolbar")).toBeHidden();
    await popup.close();
  });

  test("deleted boards survive reload in the trash and restore", async ({ page }) => {
    await expect(page.locator("article.board-card")).toHaveCount(4);
    const card = page.locator("article.board-card").first();
    const title = (await card.getByRole("heading", { level: 2 }).textContent()) ?? "";
    await card.getByRole("button", { name: "Board actions" }).click();
    await page.getByRole("menuitem", { name: "Delete board" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete board" }).click();
    await expect(page.locator("article.board-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "Recently deleted" })).toBeVisible();

    await page.reload();
    await expect(page.locator("article.board-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "Recently deleted" })).toBeVisible();
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    await expect(page.locator("article.board-card")).toHaveCount(4);
    await expect(page.locator("article.board-card").filter({ hasText: title }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recently deleted" })).toHaveCount(0);
  });

  test("backup downloads every board and restores after deletion", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Back up all" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^cutroom-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const backup = JSON.parse(fs.readFileSync(await download.path(), "utf8")) as {
      format: string;
      projects: { storyboard: { title: string } }[];
    };
    expect(backup.format).toBe("cutroom-backup");
    expect(backup.projects).toHaveLength(4);

    const card = page.locator("article.board-card").first();
    await card.getByRole("button", { name: "Board actions" }).click();
    await page.getByRole("menuitem", { name: "Delete board" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete board" }).click();
    await expect(page.locator("article.board-card")).toHaveCount(3);

    await page.getByRole("button", { name: "Restore backup" }).click();
    await page.locator('input[type="file"][accept*="json"]').setInputFiles(await download.path());
    await expect(page.locator("article.board-card")).toHaveCount(7);
  });

  test("welcome, legal and contact pages are reachable", async ({ page }) => {
    await page.goto("/#/welcome");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Storyboard the cut before you shoot it.");
    await expect(page.getByRole("heading", { name: "Made for the people who plan the frame" })).toBeVisible();
    await page.getByRole("link", { name: "Privacy", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your boards stay in your browser.");
    await page.getByRole("link", { name: "Terms", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A free tool");
    await page.getByRole("link", { name: "Contact", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tell us what broke");
    await page.goto("/#/welcome");
    await page.getByRole("button", { name: "Open a demo board" }).click();
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
