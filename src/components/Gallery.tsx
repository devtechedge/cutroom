import { useRef, useState, type ReactNode } from "react";
import type { AssetResolver } from "../render/primitives";
import type { Storyboard } from "../model/types";
import { ASPECT_VALUE } from "../model/geometry";
import { formatWhen } from "../lib/format";
import { FrameArtView } from "./FrameView";
import { Icon } from "./Icon";
import { ConfirmDialog, MenuButton } from "./ui";

export interface GalleryProps {
  projects: Storyboard[];
  resolve: AssetResolver;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onExportJson: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (file: File) => void;
  persistent: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  children?: ReactNode;
}

function BoardCard({
  project,
  resolve,
  onOpen,
  onRename,
  onDuplicate,
  onExportJson,
  onDelete,
}: {
  project: Storyboard;
  resolve: AssetResolver;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onExportJson: () => void;
  onDelete: () => void;
}): ReactNode {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const firstFrame = project.frames.at(0);
  const ratio = ASPECT_VALUE[project.aspect];

  return (
    <article className="board-card">
      <button
        type="button"
        className="board-thumb"
        style={{ ["--thumb-ratio" as string]: String(ratio) }}
        onClick={onOpen}
        aria-label={`Open board ${project.title}`}
      >
        <span className="thumb-art">
          {firstFrame && <FrameArtView frame={firstFrame} aspect={project.aspect} resolve={resolve} />}
        </span>
        <span className="thumb-open-hint" aria-hidden="true">
          Open board
        </span>
      </button>
      <div className="board-card-body">
        {editing ? (
          <input
            /* autofocus is intentional: the visitor just chose inline rename */
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="mono"
            defaultValue={project.title}
            aria-label="Board title"
            maxLength={120}
            onBlur={(e) => {
              onRename(e.target.value.trim() || project.title);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(e.currentTarget.value.trim() || project.title);
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <h3 className="board-card-title" style={{ margin: 0 }}>
            {project.title}
          </h3>
        )}
        <div className="board-card-meta">
          {project.aspect} · {project.frames.length} frame{project.frames.length === 1 ? "" : "s"} · edited {formatWhen(project.updatedAt)}
        </div>
        {project.brief.trim().length > 0 && <p className="board-card-brief" style={{ margin: 0 }}>{project.brief}</p>}
      </div>
      <div className="board-card-actions">
        <button type="button" className="btn small primary" onClick={onOpen}>
          <Icon name="play" size={13} />
          Open
        </button>
        <span style={{ flex: 1 }} />
        <MenuButton
          icon={<Icon name="sliders" />}
          label=""
          align="right"
          items={[
            { label: "Rename", onSelect: () => setEditing(true) },
            { label: "Duplicate", onSelect: onDuplicate },
            { label: "Export project JSON", onSelect: onExportJson },
            { label: "Delete board", danger: true, separatorBefore: true, onSelect: () => setConfirmDelete(true) },
          ]}
        />
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this board?"
          body={
            <>
              “{project.title}” and its {project.frames.length} frame{project.frames.length === 1 ? "" : "s"} will be removed from this browser. This cannot be
              undone.
            </>
          }
          confirmLabel="Delete board"
          danger
          onConfirm={onDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </article>
  );
}

export function Gallery(props: GalleryProps): ReactNode {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    projects,
    resolve,
    onCreate,
    onOpen,
    onRename,
    onDuplicate,
    onExportJson,
    onDelete,
    onImport,
    persistent,
    theme,
    onToggleTheme,
  } = props;

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="scroll-hover" style={{ minHeight: "100%", overflowY: "auto" }}>
      <header className="app-header">
        <span className="wordmark">
          <Icon name="logo" size={18} />
          CUTROOM
        </span>
        <span className="header-spacer" />
        <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
      </header>

      <main className="gallery" id="main">
        <div className="gallery-hero">
          <div>
            <h1>Storyboard the cut before you shoot it.</h1>
            <p className="lede">
              CUTROOM is a visual narrative studio: compose frames on a canvas, set the rhythm on the timeline, preview the sequence, and export
              presentation-ready boards.
            </p>
          </div>
          <div className="gallery-actions">
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" />
              Import JSON
            </button>
            <button type="button" className="btn primary" onClick={onCreate}>
              <Icon name="plus" />
              New storyboard
            </button>
          </div>
        </div>
        <div className="gallery-meta-row mono">
          <span>{projects.length} board{projects.length === 1 ? "" : "s"}</span>
          <span aria-hidden="true">·</span>
          <span>{persistent ? "autosaves to this browser, nothing leaves your machine" : "storage unavailable, this session is memory-only"}</span>
        </div>

        {sorted.length === 0 ? (
          <div className="empty-state">
            <p style={{ marginTop: 0 }}>No boards yet.</p>
            <button type="button" className="btn primary" onClick={onCreate}>
              <Icon name="plus" />
              New storyboard
            </button>
          </div>
        ) : (
          <div className="board-grid">
            {sorted.map((p) => (
              <BoardCard
                key={p.id}
                project={p}
                resolve={resolve}
                onOpen={() => onOpen(p.id)}
                onRename={(title) => onRename(p.id, title)}
                onDuplicate={() => onDuplicate(p.id)}
                onExportJson={() => onExportJson(p.id)}
                onDelete={() => onDelete(p.id)}
              />
            ))}
          </div>
        )}
      </main>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
