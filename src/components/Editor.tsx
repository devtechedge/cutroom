import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useEditor, EditorProvider } from "../state/editor";
import * as ops from "../model/ops";
import { newImageObject, newShapeObject, newTextObject, relayoutForAspect } from "../model/defaults";
import { instantiatePreset, ARTWORK_PRESETS } from "../model/artwork";
import { frameHeightUnits, frameNumber } from "../model/geometry";
import { ASPECT_RATIOS, type AspectRatio, type FrameObject, type ShapeObject, type Storyboard } from "../model/types";
import type { Asset } from "../model/types";
import type { AssetResolver } from "../render/primitives";
import { exportFramePng, exportProjectJson, exportSheetPng, exportSheetSvg } from "../export/exporters";
import { Stage } from "./Stage";
import { Inspector } from "./Inspector";
import { Timeline } from "./Timeline";
import { Preview } from "./Preview";
import { Icon } from "./Icon";
import { ConfirmDialog, Dialog, LiveStatus, Menu, MenuButton, Toast } from "./ui";

export type SaveState = "saved" | "saving" | "dirty" | "error";

export interface SaveStatus {
  state: SaveState;
  at: number | null;
  message?: string;
}

export interface EditorProps {
  resolve: AssetResolver;
  onAddAsset: (asset: Asset) => void;
  onBack: () => void;
  onDelete: () => void;
  saveStatus: SaveStatus;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  persistent: boolean;
}

function SaveStatusView({ status }: { status: SaveStatus }): JSX.Element {
  const label =
    status.state === "saved"
      ? `Saved${status.at ? ` ${new Date(status.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : ""}`
      : status.state === "saving"
        ? "Saving…"
        : status.state === "dirty"
          ? "Unsaved changes"
          : (status.message ?? "Save failed");
  return (
    <span className="save-status mono" data-state={status.state} role="status">
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function EditorInner({ resolve, onAddAsset, onBack, onDelete, saveStatus, theme, onToggleTheme, persistent }: EditorProps): JSX.Element {
  const ed = useEditor();
  const { sb, frame, frameIndex, object } = ed;
  const [preview, setPreview] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [boardDialog, setBoardDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [exportMenu, setExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3800);
  }, []);

  // global shortcuts: undo/redo and help, skipped while typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) ed.redo();
        else ed.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        ed.redo();
        return;
      }
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setShortcuts(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ed]);

  const addObject = (obj: FrameObject, label: string): void => {
    if (!frame) return;
    ed.run(label, (sbNow) => ops.addObject(sbNow, frame.id, obj), { objectId: obj.id });
    if (window.innerWidth < 1024) setInspectorOpen(true);
  };

  const addShape = (shape: ShapeObject["shape"]): void => {
    if (!frame) return;
    const fh = frameHeightUnits(sb.aspect);
    const w = 420;
    const h = shape === "line" ? 0 : Math.min(fh * 0.4, 260);
    addObject(newShapeObject({ shape, x: (1000 - w) / 2, y: (fh - h) / 2, w, h, fill: "#d7f04c", strokeColor: "#201d18", strokeWidth: shape === "line" ? 10 : 0 }), "add-object");
  };

  const addText = (): void => {
    if (!frame) return;
    addObject(newTextObject({ text: "Scene heading", x: 90, y: 90, w: 820, size: 72, weight: 600 }), "add-object");
  };

  const addArtwork = (presetId: string): void => {
    if (!frame) return;
    const objs = instantiatePreset(presetId);
    if (objs.length === 0) return;
    const lastId = objs[objs.length - 1].id;
    ed.run("add-artwork", (sbNow) => objs.reduce((s, o) => ops.addObject(s, frame.id, o), sbNow), { objectId: lastId });
    if (window.innerWidth < 1024) setInspectorOpen(true);
  };

  const addImage = (): void => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !frame) return;
      try {
        const { fileToAsset } = await import("../lib/assets");
        const asset = await fileToAsset(file);
        const ratio = asset.width / Math.max(asset.height, 1);
        const w = Math.min(720, Math.max(120, Math.round(ratio * 300)));
        const h = Math.min(520, Math.round(w / Math.max(ratio, 0.2)));
        const fh = frameHeightUnits(sb.aspect);
        const obj = newImageObject(asset.id, { x: (1000 - w) / 2, y: Math.max(20, (fh - h) / 2 - 30), w, h });
        addObject(obj, "add-object");
        onAddAsset(asset);
        showToast(`Added “${file.name}”. Images stay in this browser (8 MB max each).`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Could not add that image.");
      }
    };
    input.click();
  };

  const runExport = async (kind: "sheet-png" | "sheet-svg" | "frame-png" | "json"): Promise<void> => {
    setExporting(true);
    try {
      if (kind === "json") {
        exportProjectJson(sb);
        showToast("Project JSON downloaded. It embeds image data, so it can be re-imported anywhere.");
      } else if (kind === "sheet-png") {
        const pages = await exportSheetPng(sb, resolve);
        showToast(`Contact sheet exported (${pages} page${pages === 1 ? "" : "s"}, PNG).`);
      } else if (kind === "sheet-svg") {
        const pages = exportSheetSvg(sb, resolve);
        showToast(`Contact sheet exported (${pages} page${pages === 1 ? "" : "s"}, SVG).`);
      } else if (frame) {
        await exportFramePng(sb, frame, frameIndex, resolve);
        showToast(`Frame ${frameNumber(frameIndex)} exported as PNG.`);
      }
    } catch (err) {
      showToast(err instanceof Error ? `Export failed: ${err.message}` : "Export failed.");
    } finally {
      setExporting(false);
      setExportMenu(false);
    }
  };

  const changeAspect = (aspect: AspectRatio): void => {
    ed.run("change-aspect", (sbNow) => {
      const relaid: Storyboard = { ...ops.setStoryboardMeta(sbNow, { aspect }), frames: sbNow.frames.map((f) => relayoutForAspect(f, aspect)) };
      return relaid;
    });
  };

  return (
    <div className="editor">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to gallery" title="Back to gallery">
          <Icon name="move-left" />
        </button>
        <span className="wordmark hide-mobile" aria-hidden="true">
          <Icon name="logo" size={16} />
          CUTROOM
        </span>
        <input
          className="project-title-input"
          value={sb.title}
          maxLength={120}
          aria-label="Board title"
          onChange={(e) => ed.run("rename", (sbNow) => ops.setStoryboardMeta(sbNow, { title: e.target.value || "Untitled board" }))}
        />
        <SaveStatusView status={saveStatus} />
        <span className="header-spacer" />
        <button type="button" className="icon-btn" onClick={ed.undo} disabled={!ed.canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)">
          <Icon name="undo" />
        </button>
        <button type="button" className="icon-btn" onClick={ed.redo} disabled={!ed.canRedo} aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)">
          <Icon name="redo" />
        </button>
        <span style={{ position: "relative", display: "inline-flex" }}>
          <button type="button" className="btn small" aria-haspopup="menu" aria-expanded={exportMenu} data-pressed={exportMenu} disabled={exporting} onClick={() => setExportMenu((v) => !v)}>
            <Icon name="download" size={14} />
            <span className="hide-mobile">Export</span>
          </button>
          {exportMenu && (
            <Menu
              align="right"
              label="Export"
              items={[
                { label: "Contact sheet — PNG", onSelect: () => void runExport("sheet-png") },
                { label: "Contact sheet — SVG", onSelect: () => void runExport("sheet-svg") },
                { label: `Current frame — PNG`, disabled: !frame, onSelect: () => void runExport("frame-png") },
                { label: "Project JSON", separatorBefore: true, onSelect: () => void runExport("json") },
              ]}
              onClose={() => setExportMenu(false)}
            />
          )}
        </span>
        <button type="button" className="btn small primary" onClick={() => setPreview(true)}>
          <Icon name="play" size={14} />
          Preview
        </button>
        <MenuButton
          icon={<Icon name="sliders" />}
          label=""
          align="right"
          items={[
            { label: "Board settings", onSelect: () => setBoardDialog(true) },
            { label: "Keyboard shortcuts", onSelect: () => setShortcuts(true) },
            { label: theme === "dark" ? "Light theme" : "Dark theme", separatorBefore: true, onSelect: onToggleTheme },
            { label: "Delete board", danger: true, separatorBefore: true, onSelect: () => setConfirmDelete(true) },
          ]}
        />
      </header>

      {!persistent && (
        <div className="storage-banner" role="status">
          <Icon name="warning" />
          <span>Browser storage is unavailable, so this session is memory-only: close the tab and the board is gone. Export project JSON to keep a copy.</span>
        </div>
      )}
      {saveStatus.state === "error" && saveStatus.message && (
        <div className="storage-banner" role="alert">
          <Icon name="warning" />
          <span>{saveStatus.message}</span>
        </div>
      )}

      <div className="editor-main">
        <div className="stage-wrap">
          <div className="stage-toolbar" role="toolbar" aria-label="Stage tools">
            <button type="button" className="icon-btn" onClick={addImage} aria-label="Add an image (local file, 8 MB max)">
              <Icon name="image" />
              <span className="hide-mobile toolbar-label">Image</span>
            </button>
            <MenuButton icon={<Icon name="shape" />} label="Shape" items={[
              { label: "Rectangle", onSelect: () => addShape("rect") },
              { label: "Ellipse", onSelect: () => addShape("ellipse") },
              { label: "Triangle", onSelect: () => addShape("triangle") },
              { label: "Line", onSelect: () => addShape("line") },
            ]} />
            <button type="button" className="icon-btn" onClick={addText} aria-label="Add a text object">
              <Icon name="text" />
              <span className="hide-mobile toolbar-label">Text</span>
            </button>
            <MenuButton icon={<Icon name="layers" />} label="Artwork" items={ARTWORK_PRESETS.map((p) => ({ label: p.label, onSelect: () => addArtwork(p.id) }))} />
            <span className="sep" aria-hidden="true" />
            <button
              type="button"
              className="icon-btn"
              aria-pressed={frame?.guides ?? false}
              aria-label="Framing guides"
              title="Rule-of-thirds and safe area (editor only)"
              onClick={() => frame && ed.run("edit-guides", (sbNow) => ops.setFrameMeta(sbNow, frame.id, { guides: !frame.guides }))}
            >
              <Icon name="fit" />
            </button>
            <span className="header-spacer" />
            <span className="toolbar-label mono hide-mobile">{Math.round(zoom * 100)}%</span>
            <button type="button" className="icon-btn" onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))} aria-label="Zoom out" disabled={zoom <= 0.5}>
              <Icon name="zoom-out" />
            </button>
            <button type="button" className="icon-btn" onClick={() => setZoom(1)} aria-label="Zoom to fit" aria-pressed={zoom === 1}>
              <Icon name="fit" />
            </button>
            <button type="button" className="icon-btn" onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))} aria-label="Zoom in" disabled={zoom >= 3}>
              <Icon name="zoom-in" />
            </button>
            <span className="sep" aria-hidden="true" />
            <button type="button" className="icon-btn inspector-toggle" aria-label="Toggle inspector" aria-expanded={inspectorOpen} onClick={() => setInspectorOpen((v) => !v)}>
              <Icon name="sliders" />
            </button>
          </div>
          <Stage resolve={resolve} zoom={zoom} />
          {frame && (
            <div className="stage-caption" aria-hidden="true">
              {frame.caption.visible && frame.caption.text.trim().length > 0 && <span className="cap-text">{frame.caption.text}</span>}
            </div>
          )}
        </div>
        <button type="button" className="inspector-scrim" aria-label="Close inspector" hidden={!inspectorOpen} onClick={() => setInspectorOpen(false)} />
        <Inspector onAddAsset={onAddAsset} onToast={showToast} />
      </div>

      <Timeline resolve={resolve} />

      {preview && <Preview resolve={resolve} onClose={() => setPreview(false)} />}

      {shortcuts && (
        <Dialog title="Keyboard shortcuts" onClose={() => setShortcuts(false)}>
          <div className="shortcuts-grid">
            <kbd>Ctrl+Z</kbd> <span>Undo</span>
            <kbd>Ctrl+Shift+Z</kbd> <span>Redo</span>
            <kbd>←→</kbd> <span>Move between frames on the timeline</span>
            <kbd>Ctrl+←→</kbd> <span>Reorder the current frame</span>
            <kbd>Home / End</kbd> <span>First / last frame</span>
            <kbd>Tab</kbd> <span>Reach objects on the stage</span>
            <kbd>Enter</kbd> <span>Select the focused object</span>
            <kbd>Arrow keys</kbd> <span>Nudge the selected object (Shift = fine)</span>
            <kbd>Delete</kbd> <span>Remove the selected object</span>
            <kbd>Esc</kbd> <span>Deselect · close dialogs and preview</span>
            <kbd>Space</kbd> <span>Play / pause in preview</span>
            <kbd>?</kbd> <span>This list</span>
          </div>
        </Dialog>
      )}

      {boardDialog && (
        <Dialog title="Board settings" onClose={() => setBoardDialog(false)}>
          <div className="field">
            <span>Aspect ratio (composition is preserved; objects clamp to the new frame)</span>
            <div className="aspect-cards" role="group" aria-label="Aspect ratio">
              {ASPECT_RATIOS.map((a) => (
                <button key={a} type="button" className="aspect-card" aria-pressed={sb.aspect === a} onClick={() => changeAspect(a)}>
                  <span
                    className="shape"
                    style={{ aspectRatio: a === "16:9" ? "16/9" : a === "4:3" ? "4/3" : a === "1:1" ? "1/1" : "9/16", width: a === "9:16" ? 22 : 40 }}
                  />
                  {a}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Author</span>
            <input value={sb.author} maxLength={80} onChange={(e) => ed.run("edit-author", (s) => ops.setStoryboardMeta(s, { author: e.target.value }))} />
          </label>
          <label className="field">
            <span>Brief</span>
            <textarea rows={3} maxLength={600} value={sb.brief} onChange={(e) => ed.run("edit-brief", (s) => ops.setStoryboardMeta(s, { brief: e.target.value }))} />
          </label>
        </Dialog>
      )}

      {confirmDelete && frame && (
        <ConfirmDialog
          title="Delete this board?"
          body={`“${sb.title}” and all ${sb.frames.length} frames will be removed from this browser.`}
          confirmLabel="Delete board"
          danger
          onConfirm={onDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}

      <Toast message={toast} />
      <LiveStatus message={object ? `Selected ${object.kind}` : frame ? `Frame ${frameNumber(frameIndex)} of ${sb.frames.length}` : ""} />
    </div>
  );
}

export function Editor(props: EditorProps & { project: Storyboard; onCommit: (sb: Storyboard) => void }): JSX.Element {
  const { project, onCommit, ...rest } = props;
  const onCommitStable = useRef(onCommit);
  useEffect(() => {
    onCommitStable.current = onCommit;
  }, [onCommit]);
  const handleCommit = useCallback((sb: Storyboard) => onCommitStable.current(sb), []);
  return (
    <EditorProvider project={project} onCommit={handleCommit}>
      <EditorInner {...rest} />
    </EditorProvider>
  );
}
