import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { Asset, Storyboard } from "./model/types";
import { duplicateStoryboard } from "./model/ops";
import { newId } from "./model/ids";
import { estimateUsage, loadLibrary, saveAssetRecord, saveProject, deleteProjectRecord, deleteAssetRecord } from "./persist/store";
import type { SimpleDB } from "./persist/db";
import type { AssetResolver } from "./render/primitives";
import { exportProjectJson, importStoryboardFile } from "./export/exporters";
import { remapAssetIds } from "./export/projectfile";
import { formatBytes } from "./lib/format";
import { Gallery } from "./components/Gallery";
import { Editor, type SaveStatus } from "./components/Editor";
import { NewProjectDialog } from "./components/NewProjectDialog";
import { Dialog, Toast } from "./components/ui";
import { Icon } from "./components/Icon";

type Theme = "dark" | "light";
type Route = { name: "gallery" } | { name: "editor"; id: string };

const AUTOSAVE_MS = 600;

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
  const [route, setRoute] = useState<Route>({ name: "gallery" });
  const [projects, setProjects] = useState<Storyboard[]>([]);
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map());
  const [db, setDb] = useState<SimpleDB | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [booted, setBooted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "saved", at: null });
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<{ title: string; issues: string[] } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const saveTimer = useRef<number | undefined>(undefined);
  const pendingSaves = useRef<Map<string, Storyboard>>(new Map());
  const assetsRef = useRef<Map<string, Asset>>(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
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
      const lib = await loadLibrary();
      if (!life.alive) return;
      let list = lib.projects;
      let seeded = false;
      if (list.length === 0) {
        const { buildStarterLibrary } = await import("./model/starters");
        list = buildStarterLibrary();
        seeded = true;
      }
      setDb(lib.db);
      setPersistent(lib.persistent);
      setWarning(lib.warning);
      setAssets(lib.assets);
      setProjects(list);
      setBooted(true);
      if (seeded) {
        for (const sb of list) void saveProject(lib.db, sb);
      }
      // drop assets no project references anymore
      try {
        const referenced = new Set<string>();
        for (const sb of list) for (const f of sb.frames) for (const o of f.objects) if (o.kind === "image") referenced.add(o.assetId);
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
          .then(() => setSaveStatus({ state: "saved", at: Date.now() }))
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
      const a = assetsRef.current.get(id);
      return a ? { dataUrl: a.dataUrl, width: a.width, height: a.height } : undefined;
    },
    [],
  );

  const createProject = (sb: Storyboard): void => {
    upsertProject(sb);
    if (db) void saveProject(db, sb).catch(() => undefined);
    setShowNew(false);
    setRoute({ name: "editor", id: sb.id });
  };

  const deleteProject = (id: string): void => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    pendingSaves.current.delete(id);
    if (db) void deleteProjectRecord(db, id).catch(() => undefined);
    setRoute({ name: "gallery" });
    showToast("Board deleted. Orphaned images are cleaned up next time the app starts.");
  };

  const duplicateProject = (id: string): void => {
    const source = projects.find((p) => p.id === id);
    if (!source) return;
    const copy = duplicateStoryboard(source, `${source.title} copy`);
    upsertProject(copy);
    if (db) void saveProject(db, copy).catch(() => undefined);
    showToast(`Duplicated as “${copy.title}”.`);
  };

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
      upsertProject(imported);
      if (db) void saveProject(db, imported).catch(() => undefined);
      if (fixes.length > 0) {
        setImportIssues({ title: imported.title, issues: fixes.map((f) => `${f.path}: ${f.message}`) });
      } else {
        showToast(`Imported “${imported.title}”.`);
      }
      setRoute({ name: "editor", id: imported.id });
    } catch (err) {
      setImportIssues({ title: file.name, issues: [err instanceof Error ? err.message : "The file could not be read as a CUTROOM project."] });
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

  const current = route.name === "editor" ? projects.find((p) => p.id === route.id) : undefined;

  const editorCommit = useMemo(() => (sb: Storyboard) => commitProject(sb), [commitProject]);

  if (!booted) {
    return (
      <div className="boot-shell" role="status" aria-live="polite">
        <div className="boot-wordmark">CUTROOM</div>
        <div className="boot-line">Loading your boards</div>
      </div>
    );
  }

  return (
    <>
      {route.name === "gallery" || !current ? (
        <Gallery
          projects={projects}
          resolve={resolve}
          onCreate={() => setShowNew(true)}
          onOpen={(id) => setRoute({ name: "editor", id })}
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
          persistent={persistent}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        />
      ) : (
        <Editor
          key={current.id}
          project={current}
          onCommit={editorCommit}
          resolve={resolve}
          assets={assets}
          onAddAsset={addAsset}
          onBack={() => setRoute({ name: "gallery" })}
          onDelete={() => deleteProject(current.id)}
          saveStatus={saveStatus}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          persistent={persistent}
        />
      )}

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
        <Dialog title={importIssues.issues.length === 1 && /not valid JSON|does not contain|Unsupported project version/i.test(importIssues.issues[0]) ? "Import failed" : "Imported with fixes"} onClose={() => setImportIssues(null)}>
          <p style={{ margin: 0 }}>
            <strong>{importIssues.title}</strong>
          </p>
          {importIssues.issues.length === 1 && /not valid JSON|does not contain|Unsupported project version/i.test(importIssues.issues[0]) ? (
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
