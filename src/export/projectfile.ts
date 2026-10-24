import type { Asset, Storyboard } from "../model/types";
import { sanitizeAsset, sanitizeStoryboard, type ValidationIssue } from "../model/validate";

export const PROJECT_FILE_FORMAT = "cutroom-project";
export const PROJECT_FILE_VERSION = 2;
export const MAX_PROJECT_BYTES = 25 * 1024 * 1024;

export interface ProjectFile {
  format: typeof PROJECT_FILE_FORMAT;
  schemaVersion: typeof PROJECT_FILE_VERSION;
  storyboard: Storyboard;
  assets: Asset[];
}

export interface ParsedProject {
  sb: Storyboard;
  assets: Asset[];
  fixes: ValidationIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function referencedAssetIds(sb: Storyboard): Set<string> {
  const used = new Set<string>();
  for (const frame of sb.frames) {
    for (const object of frame.objects) {
      if (object.kind === "image") used.add(object.assetId);
    }
  }
  return used;
}

export function buildProjectFile(sb: Storyboard, assets: Iterable<Asset>): ProjectFile {
  const byId = new Map<string, Asset>();
  for (const asset of assets) byId.set(asset.id, asset);
  const included = [...referencedAssetIds(sb)]
    .map((id) => byId.get(id))
    .filter((asset): asset is Asset => asset !== undefined);
  return {
    format: PROJECT_FILE_FORMAT,
    schemaVersion: PROJECT_FILE_VERSION,
    storyboard: sb,
    assets: included,
  };
}

export function remapAssetIds(sb: Storyboard, mapping: ReadonlyMap<string, string>): Storyboard {
  return {
    ...sb,
    frames: sb.frames.map((frame) => ({
      ...frame,
      objects: frame.objects.map((object) =>
        object.kind === "image" ? { ...object, assetId: mapping.get(object.assetId) ?? object.assetId } : object,
      ),
    })),
  };
}

export function parseProjectFile(input: unknown): ParsedProject {
  const fixes: ValidationIssue[] = [];
  if (isRecord(input) && input.format === PROJECT_FILE_FORMAT && input.schemaVersion === PROJECT_FILE_VERSION) {
    if (!isRecord(input.storyboard)) throw new Error("Project file is missing its storyboard.");
    const { value, fixes: boardFixes } = sanitizeStoryboard(input.storyboard);
    fixes.push(...boardFixes);

    const rawAssets: unknown[] = Array.isArray(input.assets) ? (input.assets as unknown[]) : [];
    const available = new Map<string, Asset>();
    for (let i = 0; i < rawAssets.length; i += 1) {
      const raw = rawAssets[i];
      const asset = sanitizeAsset(raw);
      if (!asset) {
        fixes.push({ path: `assets[${i}]`, message: "dropped: invalid image asset" });
        continue;
      }
      if (isRecord(raw) && raw.id !== asset.id) {
        fixes.push({ path: `assets[${i}].id`, message: "invalid id; image reference cannot be restored" });
        continue;
      }
      available.set(asset.id, asset);
    }

    const assets: Asset[] = [];
    for (const id of referencedAssetIds(value)) {
      const asset = available.get(id);
      if (asset) assets.push(asset);
      else fixes.push({ path: "assets", message: `missing image asset ${id}` });
    }
    return { sb: value, assets, fixes };
  }

  const { value, fixes: boardFixes } = sanitizeStoryboard(input);
  fixes.push(...boardFixes);
  if (referencedAssetIds(value).size > 0) {
    fixes.push({ path: "schemaVersion", message: "version 1 files do not include images; image objects will show as missing" });
  }
  return { sb: value, assets: [], fixes };
}
