import type { Asset, Storyboard } from "../model/types";
import type { ValidationIssue } from "../model/validate";
import { buildProjectFile, parseProjectFile, PROJECT_FILE_FORMAT, PROJECT_FILE_VERSION, type ParsedProject, type ProjectFile } from "./projectfile";

export const BACKUP_FORMAT = "cutroom-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof BACKUP_VERSION;
  exportedAt: number;
  projects: ProjectFile[];
}

export interface ParsedBackup {
  projects: ParsedProject[];
  fixes: ValidationIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildBackupFile(projects: readonly Storyboard[], assets: Iterable<Asset>): BackupFile {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_VERSION,
    exportedAt: Date.now(),
    projects: projects.map((project) => buildProjectFile(project, assets)),
  };
}

export function serializeBackupFile(projects: readonly Storyboard[], assets: Iterable<Asset>): string {
  const text = JSON.stringify(buildBackupFile(projects, assets), null, 2);
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    throw new Error("Backup is larger than 100 MB. Export boards individually and remove unused images first.");
  }
  return text;
}

export function parseBackupFile(input: unknown): ParsedBackup {
  if (!isRecord(input) || input.format !== BACKUP_FORMAT) {
    throw new Error("This is not a CUTROOM backup file.");
  }
  if (input.schemaVersion !== BACKUP_VERSION) {
    throw new Error("This backup was made by a newer CUTROOM version.");
  }
  const rawProjects: unknown[] = Array.isArray(input.projects) ? (input.projects as unknown[]) : [];
  if (rawProjects.length === 0) throw new Error("The backup does not contain any boards.");

  const fixes: ValidationIssue[] = [];
  const projects: ParsedProject[] = [];
  rawProjects.forEach((raw, index) => {
    if (!isRecord(raw) || raw.format !== PROJECT_FILE_FORMAT || raw.schemaVersion !== PROJECT_FILE_VERSION) {
      fixes.push({ path: `projects[${index}]`, message: "skipped: not a v2 project entry" });
      return;
    }
    try {
      const parsed = parseProjectFile(raw);
      projects.push(parsed);
      for (const issue of parsed.fixes) fixes.push({ path: `projects[${index}].${issue.path}`, message: issue.message });
    } catch (err) {
      fixes.push({ path: `projects[${index}]`, message: err instanceof Error ? `skipped: ${err.message}` : "skipped: unreadable board" });
    }
  });
  if (projects.length === 0) throw new Error("No boards in this backup could be read.");
  return { projects, fixes };
}
