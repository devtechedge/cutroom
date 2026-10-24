import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { Asset, Storyboard } from "./model/types";
import { duplicateStoryboard } from "./model/ops";
import { newId } from "./model/ids";
import { buildStarterLibrary, STARTER_TEMPLATES } from "./model/starters";
import {
  estimateUsage,
  loadLibrary,
  saveAssetRecord,
  saveProject,
  saveTrashRecord,
  deleteTrashRecord,
  deleteProjectRecord,
  deleteAssetRecord,
  TRASH_TTL_MS,
  type TrashRecord,
} from "./persist/store";
import type { SimpleDB } from "./persist/db";
import type { AssetResolver } from "./render/primitives";
import { exportProjectJson, importStoryboardFile } from "./export/exporters";
import { parseBackupFile, serializeBackupFile, MAX_BACKUP_BYTES } from "./export/backup";
import { remapAssetIds } from "./export/projectfile";
import { downloadText } from "./lib/download";
import { formatBytes } from "./lib/format";
import { Gallery } from "./components/Gallery";
import type { SaveStatus } from "./components/Editor";
import { NewProjectDialog } from "./components/NewProjectDialog";
import { Dialog, Toast } from "./components/ui";
import { Icon } from "./components/Icon";

const Editor = lazy(() => import("./components/Editor").then((module) => ({ default: module.Editor })));
const PrintSheet = lazy(() => import("./components/PrintSheet").then((module) => ({ default: module.PrintSheet })));
const Welcome = lazy(() => import("./components/InfoPages").then((module) => ({ default: module.Welcome })));
const PrivacyPage = lazy(() => import("./components/InfoPages").then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import("./components/InfoPages").then((module) => ({ default: module.TermsPage })));
const ContactPage = lazy(() => import("./components/InfoPages").then((module) => ({ default: module.ContactPage })));

type Theme = "dark" | "light";
type InfoPage = "privacy" | "terms" | "contact";
type Route =
  | { name: "gallery" }
  | { name: "editor"; id: string }
  | { name: "print"; id: string }
  | { name: "welcome" }
  | { name: "info"; page: InfoPage };

const AUTOSAVE_MS = 600;
const SEEDED_KEY = "cutroom-seeded";
const BACKUP_KEY = "cutroom-last-backup";
const REMINDER_KEY = "cutroom-backup-reminder-dismissed";
const GALLERY_TITLE = "CUTROOM: storyboard and visual narrative studio";

function readStoredNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function readStoredFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function storeFlag(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // preference persistence is best-effort
  }
}

/** Keep first paint and first interaction clear of storage bookkeeping. */
function runWhenIdle(task: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: 1500 });
  } else {
    window.setTimeout(task, 100);
  }
}

function readRoute(): Route {
  if (window.location.hash === "#/welcome") return { name: "welcome" };
  if (window.location.hash === "#/privacy") return { name: "info", page: "privacy" };
  if (window.location.hash === "#/terms") return { name: "info", page: "terms" };
  if (window.location.hash === "#/contact") return { name: "info", page: "contact" };
  const board = /^#\/board\/([^/?#]+)/.exec(window.location.hash);
  const print = /^#\/print\/([^/?#]+)/.exec(window.location.hash);
  const match = board ?? print;
  if (!match) return { name: "gallery" };
  try {
    return { name: board ? "editor" : "print", id: decodeURIComponent(match[1]) };
  } catch {
    return { name: "gallery" };
  }
}

function hashFor(route: Route): string {
  if (route.name === "editor") return `#/board/${encodeURIComponent(route.id)}`;
  if (route.name === "print") return `#/print/${encodeURIComponent(route.id)}`;
  if (route.name === "welcome") return "#/welcome";
  if (route.name === "info") return `#/${route.page}`;
  return "#/";
}

function BootShell({ line }: { line: string }): JSX.Element {
  return (
    <div className="boot-shell" role="status" aria-live="polite">
      <div className="boot-wordmark">CUTROOM</div>
      <div className="boot-line">{line}</div>
    </div>
  );
}

function hasSeeded(): boolean {
  try {
    return localStorage.getItem(SEEDED_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeeded(): void {
  try {
    localStorage.setItem(SEEDED_KEY, "1");
  } catch {
    // seeding stays best-effort when storage is blocked
  }
}

function loadTheme(): Theme {
  try {
    const v = localStorage.getItem("cutroom-theme");
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export default function App(): JSX.Element {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [route, setRoute] = useState<Route>(readRoute);
  const [projects, setProjects] = useState<Storyboard[]>([]);
  const [trash, setTrash] = useState<TrashRecord[]>([]);
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map());
  const [db, setDb] = useState<SimpleDB | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => readStoredNumber(BACKUP_KEY));
  const [reminderDismissed, setReminderDismissed] = useState(() => readStoredFlag(REMINDER_KEY));
  const [persistent, setPersistent] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "saved", at: null });
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<{ title: string; issues: string[]; failed: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const saveTimer = useRef<number | undefined>(undefined);
  const pendingSaves = useRef<Map<string, Storyboard>>(new Map());
  const deletedIds = useRef<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const navigate = useCallback((next: Route, replace = false): void => {
    const hash = hashFor(next);
    if (window.location.hash !== hash) {
      if (replace) window.history.replaceState(null, "", hash);
      else window.history.pushState(null, "", hash);
    }
    setRoute(next);
  }, []);

  useEffect(() => {
    const onRoute = (): void => setRoute(readRoute());
    window.addEventListener("hashchange", onRoute);
    window.addEventListener("popstate", onRoute);
    return () => {
      window.removeEventListener("hashchange", onRoute);
      window.removeEventListener("popstate", onRoute);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#efe9db" : "#1d1b18");
    try {
      localStorage.setItem("cutroom-theme", theme);
    } catch {
      // theme persistence is best-effort
    }
  }, [theme]);

  // boot: load library, seed starters on first run, GC orphaned assets
  useEffect(() => {
    const life = { alive: true };
    void (async () => {
      try {
        const lib = await loadLibrary();
        if (!life.alive) return;
        const hadProjects = lib.projects.length > 0;
        let list = lib.projects;
        let seeded = false;
        if (list.length === 0 && !hasSeeded()) {
          list = buildStarterLibrary();
          seeded = true;
        }
        const now = Date.now();
        const keptTrash = lib.trash.filter((record) => now - record.deletedAt <= TRASH_TTL_MS);
        const expiredTrash = lib.trash.filter((record) => now - record.deletedAt > TRASH_TTL_MS);
        if ((hadProjects || lib.trash.length > 0) && lib.persistent) markSeeded();
        setDb(lib.db);
        setPersistent(lib.persistent);
        setWarning(lib.warning);
        setAssets(lib.assets);
        setProjects(list);
        setTrash(keptTrash);
        setBooted(true);
        if (seeded) {
          runWhenIdle(() => {
            void Promise.all(list.map((sb) => saveProject(lib.db, sb)))
              .then(() => {
                if (lib.persistent) markSeeded();
                for (const id of deletedIds.current) void deleteProjectRecord(lib.db, id).catch(() => undefined);
              })
              .catch(() => undefined);
          });
        }
        runWhenIdle(() => {
          for (const record of expiredTrash) {
            void deleteTrashRecord(lib.db, record.storyboard.id).catch(() => undefined);
          }
          // drop assets no active or recoverable board references anymore
          void (async () => {
            try {
              const referenced = new Set<string>();
              for (const sb of [...list, ...keptTrash.map((r) => r.storyboard)]) {
                for (const f of sb.frames) for (const o of f.objects) if (o.kind === "image") referenced.add(o.assetId);
              }
              for (const asset of lib.assets.values()) {
                if (!referenced.has(asset.id)) {
                  await deleteAssetRecord(lib.db, asset.id);
                  setAssets((prev) => {
                    const next = new Map(prev);
                    next.delete(asset.id);
                    return next;
                  });
                }
              }
            } catch {
              // GC is best-effort
            }
          })();
        });
      } catch (err) {
        if (!life.alive) return;
        setBootError(err instanceof Error ? err.message : "CUTROOM could not open its local library.");
        setBooted(true);
      }
    })();
    return () => {
      life.alive = false;
    };
  }, []);

  // flush pending saves when the page hides
  useEffect(() => {
    const flush = (): void => {
      if (saveTimer.current !== undefined) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = undefined;
      }
      for (const [id, sb] of pendingSaves.current) {
        if (db) void saveProject(db, sb).catch(() => undefined);
        pendingSaves.current.delete(id);
      }
    };
    const onVis = (): void => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [db]);

  const savePending = saveStatus.state === "saving" || saveStatus.state === "error";
  useEffect(() => {
    if (!savePending) return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [savePending]);

  const upsertProject = useCallback((sb: Storyboard) => {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === sb.id);
      if (idx === -1) return [...prev, sb];
      const next = [...prev];
      next[idx] = sb;
      return next;
    });
  }, []);

  const commitProject = useCallback(
    (sb: Storyboard) => {
      upsertProject(sb);
      pendingSaves.current.set(sb.id, sb);
      setSaveStatus({ state: "saving", at: null });
      if (saveTimer.current !== undefined) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = undefined;
        const batch = [...pendingSaves.current.values()];
        pendingSaves.current.clear();
        if (!db) {
          setSaveStatus({ state: "error", at: null, message: "Storage is unavailable; changes live only in this tab." });
          return;
        }
        Promise.all(batch.map((s) => saveProject(db, s)))
          .then(() => {
            for (const id of deletedIds.current) void deleteProjectRecord(db, id).catch(() => undefined);
            setSaveStatus({ state: "saved", at: Date.now() });
          })
          .catch((err: unknown) => {
            const quota = err instanceof DOMException && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
            setSaveStatus({
              state: "error",
              at: null,
              message: quota
                ? "Storage is full. Older boards keep their last saved state; export or delete boards to free space. Current edits stay in memory."
                : "Could not write to storage; edits stay in memory for this session.",
            });
          });
      }, AUTOSAVE_MS);
    },
    [db, upsertProject],
  );

  const addAsset = useCallback(
    (asset: Asset) => {
      setAssets((prev) => {
        const next = new Map(prev);
        next.set(asset.id, asset);
        return next;
      });
      if (db) void saveAssetRecord(db, asset).catch(() => showToast("Image could not be stored; it will work until this tab closes."));
      void estimateUsage().then((info) => {
        if (info && info.quota && info.usage / info.quota > 0.85) {
          showToast(`Browser storage is ${Math.round((info.usage / info.quota) * 100)}% full (${formatBytes(info.usage)} used). Consider exporting and deleting old boards.`);
        }
      });
    },
    [db, showToast],
  );

  const resolve: AssetResolver = useCallback(
    (id: string) => {
      const a = assets.get(id);
      return a ? { dataUrl: a.dataUrl, width: a.width, height: a.height } : undefined;
    },
    [assets],
  );

  const createProject = (sb: Storyboard): void => {
    deletedIds.current.delete(sb.id);
    upsertProject(sb);
    if (db) void saveProject(db, sb).catch(() => undefined);
    setShowNew(false);
    navigate({ name: "editor", id: sb.id });
  };

  const deleteProject = (id: string): void => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    const record: TrashRecord = { storyboard: target, deletedAt: Date.now() };
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTrash((prev) => [record, ...prev.filter((r) => r.storyboard.id !== id)]);
    deletedIds.current.add(id);
    pendingSaves.current.delete(id);
    if (persistent) markSeeded();
    if (db) {
      void saveTrashRecord(db, record).catch(() => showToast("The board could not be moved to Recently deleted; it is still in memory for this session."));
      void deleteProjectRecord(db, id).catch(() => undefined);
    }
    navigate({ name: "gallery" });
    showToast("Board moved to Recently deleted. Restore it from the gallery within 30 days.");
  };

  const restoreTrash = (id: string): void => {
    const record = trash.find((r) => r.storyboard.id === id);
    if (!record) return;
    const board = projects.some((p) => p.id === id) ? duplicateStoryboard(record.storyboard, record.storyboard.title) : record.storyboard;
    deletedIds.current.delete(id);
    setTrash((prev) => prev.filter((r) => r.storyboard.id !== id));
    upsertProject(board);
    if (db) {
      void deleteTrashRecord(db, id).catch(() => undefined);
      void saveProject(db, board).catch(() => undefined);
    }
    showToast(`Restored “${board.title}”.`);
  };

  const deleteTrashForever = (id: string): void => {
    const record = trash.find((r) => r.storyboard.id === id);
    if (!record) return;
    const remainingTrash = trash.filter((r) => r.storyboard.id !== id);
    setTrash(remainingTrash);
    if (db) void deleteTrashRecord(db, id).catch(() => undefined);
    const stillUsed = new Set<string>();
    for (const sb of [...projects, ...remainingTrash.map((r) => r.storyboard)]) {
      for (const frame of sb.frames) for (const object of frame.objects) if (object.kind === "image") stillUsed.add(object.assetId);
    }
    const gone = new Set<string>();
    for (const frame of record.storyboard.frames) {
      for (const object of frame.objects) if (object.kind === "image" && !stillUsed.has(object.assetId)) gone.add(object.assetId);
    }
    if (gone.size > 0) {
      setAssets((prev) => {
        const next = new Map(prev);
        for (const assetId of gone) next.delete(assetId);
        return next;
      });
      if (db) for (const assetId of gone) void deleteAssetRecord(db, assetId).catch(() => undefined);
    }
    showToast("Board permanently deleted.");
  };

  const exportBackup = useCallback((): void => {
    try {
      const text = serializeBackupFile(projects, assets.values());
      downloadText(text, `cutroom-backup-${new Date().toISOString().slice(0, 10)}.json`);
      const now = Date.now();
      setLastBackupAt(now);
      storeFlag(BACKUP_KEY, String(now));
      showToast(`Backup downloaded (${projects.length} board${projects.length === 1 ? "" : "s"}). Boards in Recently deleted are not included.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Backup failed.");
    }
  }, [projects, assets, showToast]);

  const dismissReminder = useCallback((): void => {
    setReminderDismissed(true);
    storeFlag(REMINDER_KEY, "1");
  }, []);

  const importBackup = async (file: File): Promise<void> => {
    if (file.size > MAX_BACKUP_BYTES) {
      setImportIssues({ title: file.name, issues: ["Backup is larger than 100 MB. Import boards individually instead."], failed: true });
      return;
    }
    try {
      const parsed = parseBackupFile(JSON.parse(await file.text()));
      const addedProjects: Storyboard[] = [];
      const addedAssets: Asset[] = [];
      for (const entry of parsed.projects) {
        let board = entry.sb;
        if (entry.assets.length > 0) {
          const mapping = new Map<string, string>();
          const copies = entry.assets.map((asset) => ({ ...asset, id: newId(), addedAt: Date.now() }));
          entry.assets.forEach((asset, index) => mapping.set(asset.id, copies[index].id));
          board = remapAssetIds(board, mapping);
          addedAssets.push(...copies);
        }
        const exists = projects.some((p) => p.id === board.id) || addedProjects.some((p) => p.id === board.id);
        const next = exists ? duplicateStoryboard(board, board.title) : board;
        deletedIds.current.delete(next.id);
        addedProjects.push(next);
        if (db) void saveProject(db, next).catch(() => undefined);
      }
      if (addedAssets.length > 0) {
        setAssets((prev) => {
          const map = new Map(prev);
          for (const asset of addedAssets) map.set(asset.id, asset);
          return map;
        });
        if (db) {
          for (const asset of addedAssets) {
            void saveAssetRecord(db, asset).catch(() => showToast("A restored image could not be stored; it will work until this tab closes."));
          }
        }
      }
      setProjects((prev) => [...prev, ...addedProjects]);
      if (parsed.fixes.length > 0) {
        setImportIssues({ title: file.name, issues: parsed.fixes.map((f) => `${f.path}: ${f.message}`), failed: false });
      } else {
        showToast(`Restored ${addedProjects.length} board${addedProjects.length === 1 ? "" : "s"} from backup.`);
      }
    } catch (err) {
      setImportIssues({ title: file.name, issues: [err instanceof Error ? err.message : "The backup could not be read."], failed: true });
    }
  };

  const duplicateProject = (id: string): void => {
    const source = projects.find((p) => p.id === id);
    if (!source) return;
    const copy = duplicateStoryboard(source, `${source.title} copy`);
    deletedIds.current.delete(copy.id);
    upsertProject(copy);
    if (db) void saveProject(db, copy).catch(() => undefined);
    showToast(`Duplicated as “${copy.title}”.`);
  };

  const restoreStarters = useCallback((): void => {
    const starters = buildStarterLibrary();
    for (const starter of starters) {
      deletedIds.current.delete(starter.id);
      upsertProject(starter);
      if (db) void saveProject(db, starter).catch(() => undefined);
    }
    if (persistent) markSeeded();
    showToast("Starter boards restored.");
  }, [db, persistent, showToast, upsertProject]);

  const openDemo = useCallback((): void => {
    const existing = projects.find((project) => project.title === "Night Shift");
    if (existing) {
      navigate({ name: "editor", id: existing.id });
      return;
    }
    const demo = STARTER_TEMPLATES[0].build();
    deletedIds.current.delete(demo.id);
    upsertProject(demo);
    if (db) void saveProject(db, demo).catch(() => undefined);
    navigate({ name: "editor", id: demo.id });
  }, [db, navigate, projects, upsertProject]);

  const importProject = async (file: File): Promise<void> => {
    try {
      const { sb, assets: importedAssets, fixes } = await importStoryboardFile(file);
      let board = sb;
      if (importedAssets.length > 0) {
        const mapping = new Map<string, string>();
        const copies = importedAssets.map((asset) => ({ ...asset, id: newId(), addedAt: Date.now() }));
        importedAssets.forEach((asset, index) => mapping.set(asset.id, copies[index].id));
        board = remapAssetIds(board, mapping);
        setAssets((prev) => {
          const next = new Map(prev);
          for (const asset of copies) next.set(asset.id, asset);
          return next;
        });
        if (db) {
          for (const asset of copies) {
            void saveAssetRecord(db, asset).catch(() => showToast("An imported image could not be stored; it will work until this tab closes."));
          }
        }
      }
      const exists = projects.some((p) => p.id === board.id);
      const imported = exists ? { ...board, id: `${board.id}-${Math.random().toString(36).slice(2, 6)}` } : board;
      deletedIds.current.delete(imported.id);
      upsertProject(imported);
      if (db) void saveProject(db, imported).catch(() => undefined);
      if (fixes.length > 0) {
        setImportIssues({ title: imported.title, issues: fixes.map((f) => `${f.path}: ${f.message}`), failed: false });
      } else {
        showToast(`Imported “${imported.title}”.`);
      }
      navigate({ name: "editor", id: imported.id });
    } catch (err) {
      setImportIssues({ title: file.name, issues: [err instanceof Error ? err.message : "The file could not be read as a CUTROOM project."], failed: true });
    }
  };
  const exportJson = useCallback(
    (project: Storyboard): void => {
      try {
        exportProjectJson(project, assets.values());
        showToast("Project JSON downloaded with its images.");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Project export failed.");
      }
    },
    [assets, showToast],
  );

  const current = route.name === "editor" || route.name === "print" ? projects.find((p) => p.id === route.id) : undefined;

  useEffect(() => {
    if (route.name === "welcome") {
      document.title = "CUTROOM: storyboard and visual narrative studio";
    } else if (route.name === "info") {
      document.title = `${route.page === "privacy" ? "Privacy" : route.page === "terms" ? "Terms" : "Contact"} - CUTROOM`;
    } else if (!current) {
      document.title = GALLERY_TITLE;
    } else if (route.name === "print") {
      document.title = `${current.title} contact sheet - CUTROOM`;
    } else {
      document.title = `${current.title} - CUTROOM`;
    }
  }, [current, route.name, route]);

  useEffect(() => {
    if (!booted) return;
    if ((route.name === "editor" || route.name === "print") && !current) {
      window.history.replaceState(null, "", "#/");
    }
  }, [booted, current, route.name]);

  const currentId = current?.id;
  useEffect(() => {
    if (route.name !== "editor" || !currentId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("cutroom-tabs");
    const tabId = Math.random().toString(36).slice(2);
    channel.onmessage = (event: MessageEvent<{ type?: string; id?: string; tabId?: string }>) => {
      if (event.data.type === "open" && event.data.id === currentId && event.data.tabId !== tabId) {
        showToast("This board is open in another tab. Changes may overwrite each other.");
      }
    };
    channel.postMessage({ type: "open", id: currentId, tabId });
    return () => channel.close();
  }, [currentId, route.name, showToast]);

  const editorCommit = useMemo(() => (sb: Storyboard) => commitProject(sb), [commitProject]);

  if (bootError) {
    return (
      <div className="boot-shell" role="alert">
        <div className="boot-wordmark">CUTROOM</div>
        <div className="boot-line">Your local library could not be opened.</div>
        <div className="boot-line" style={{ maxWidth: 420 }}>{bootError}</div>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          Reload CUTROOM
        </button>
      </div>
    );
  }

  if (!booted) {
    return <BootShell line="Loading your boards" />;
  }

  return (
    <>
      <Suspense fallback={<BootShell line="Opening CUTROOM" />}>
        {route.name === "welcome" ? (
          <Welcome theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} onOpenDemo={openDemo} />
        ) : route.name === "info" ? (
          route.page === "privacy" ? (
            <PrivacyPage theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
          ) : route.page === "terms" ? (
            <TermsPage theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
          ) : (
            <ContactPage theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
          )
        ) : route.name === "print" && current ? (
          <PrintSheet project={current} resolve={resolve} onBack={() => navigate({ name: "editor", id: current.id })} />
        ) : route.name === "gallery" || !current ? (
          <Gallery
            projects={projects}
            trash={trash}
            resolve={resolve}
            onCreate={() => setShowNew(true)}
            onOpen={(id) => navigate({ name: "editor", id })}
            onRename={(id, title) => {
              const p = projects.find((x) => x.id === id);
              if (p) commitProject({ ...p, title, updatedAt: Date.now() });
            }}
            onDuplicate={duplicateProject}
            onExportJson={(id) => {
              const p = projects.find((x) => x.id === id);
              if (p) exportJson(p);
            }}
            onDelete={deleteProject}
            onImport={(file) => void importProject(file)}
            onRestoreStarters={restoreStarters}
            onBackup={exportBackup}
            onRestoreBackup={(file) => void importBackup(file)}
            lastBackupAt={lastBackupAt}
            reminderDismissed={reminderDismissed}
            onDismissReminder={dismissReminder}
            onRestoreTrash={restoreTrash}
            onDeleteTrashForever={deleteTrashForever}
            persistent={persistent}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          />
        ) : (
          <Suspense fallback={<BootShell line="Opening the cutting room" />}>
            <Editor
              key={current.id}
              project={current}
              onCommit={editorCommit}
              resolve={resolve}
              assets={assets}
              onAddAsset={addAsset}
              onBack={() => navigate({ name: "gallery" })}
              onDelete={() => deleteProject(current.id)}
              saveStatus={saveStatus}
              theme={theme}
              onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              persistent={persistent}
            />
          </Suspense>
        )}
      </Suspense>

      {warning && !dismissed && (
        <div className="storage-banner" role="status">
          <Icon name="warning" />
          <span style={{ flex: 1 }}>{warning}</span>
          <button type="button" className="btn small" onClick={() => setDismissed(true)}>
            Dismiss
          </button>
        </div>
      )}

      {showNew && <NewProjectDialog onClose={() => setShowNew(false)} onCreate={createProject} />}

      {importIssues && (
        <Dialog title={importIssues.failed ? "Import failed" : "Imported with fixes"} onClose={() => setImportIssues(null)}>
          <p style={{ margin: 0 }}>
            <strong>{importIssues.title}</strong>
          </p>
          {importIssues.failed ? (
            <p style={{ margin: 0 }}>{importIssues.issues[0]}</p>
          ) : (
            <ul className="issue-list">
              {importIssues.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
        </Dialog>
      )}

      <Toast message={toast} />
    </>
  );
}
