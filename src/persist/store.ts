import { ASSETS, PROJECTS, openSimpleDB, type SimpleDB } from "./db";
import { sanitizeAsset, sanitizeStoryboard } from "../model/validate";
import type { Asset, Storyboard } from "../model/types";

export interface Library {
  db: SimpleDB;
  projects: Storyboard[];
  assets: Map<string, Asset>;
  /** false when persistence is memory-only for this session. */
  persistent: boolean;
  /** Storage error worth telling the user about (quota, blocked, corrupt). */
  warning: string | null;
}

/**
 * Load the whole library once at boot. Corrupt entries are sanitized or
 * skipped with a warning; a locked/full IndexedDB degrades to memory mode
 * so the app still works, with the banner explaining the limits.
 */
export async function loadLibrary(): Promise<Library> {
  let warning: string | null = null;
  const db = await openSimpleDB((err) => {
    warning = err instanceof Error ? `Storage unavailable (${err.message}); working in memory only.` : "Storage unavailable; working in memory only.";
  });
  const projects: Storyboard[] = [];
  const assets = new Map<string, Asset>();
  try {
    const rawProjects = await db.getAll(PROJECTS);
    for (const raw of rawProjects) {
      try {
        const { value } = sanitizeStoryboard(raw);
        projects.push(value);
      } catch {
        warning = warning ?? "One stored project could not be read and was skipped.";
      }
    }
    const rawAssets = await db.getAll(ASSETS);
    for (const raw of rawAssets) {
      const asset = sanitizeAsset(raw);
      if (asset) assets.set(asset.id, asset);
    }
    if (db.mode === "memory" && !warning) {
      warning = "Storage is unavailable in this browser; changes last for this session only.";
    }
  } catch (err) {
    warning = warning ?? (err instanceof Error ? `Storage error: ${err.message}` : "Storage error.");
  }
  return { db, projects, assets, persistent: db.mode === "idb", warning };
}

export async function saveProject(db: SimpleDB, sb: Storyboard): Promise<void> {
  await db.put(PROJECTS, sb.id, sb);
}

export async function deleteProjectRecord(db: SimpleDB, id: string): Promise<void> {
  await db.delete(PROJECTS, id);
}

export async function saveAssetRecord(db: SimpleDB, asset: Asset): Promise<void> {
  await db.put(ASSETS, asset.id, asset);
}

export async function deleteAssetRecord(db: SimpleDB, id: string): Promise<void> {
  await db.delete(ASSETS, id);
}

export interface StorageEstimateInfo {
  usage: number;
  quota: number | null;
}

export async function estimateUsage(): Promise<StorageEstimateInfo | null> {
  try {
    if (navigator.storage && typeof navigator.storage.estimate === "function") {
      const { usage = 0, quota = null } = await navigator.storage.estimate();
      return { usage, quota };
    }
  } catch {
    // estimate is best-effort
  }
  return null;
}
