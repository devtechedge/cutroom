import { useState, type JSX } from "react";
import { newStoryboard } from "../model/defaults";
import { buildStarterLibrary, STARTER_TEMPLATES } from "../model/starters";
import { ASPECT_RATIOS, type AspectRatio, type Storyboard } from "../model/types";
import { Dialog } from "./ui";

export interface NewProjectDialogProps {
  onClose: () => void;
  onCreate: (sb: Storyboard) => void;
}

export function NewProjectDialog({ onClose, onCreate }: NewProjectDialogProps): JSX.Element {
  const [title, setTitle] = useState("");
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [template, setTemplate] = useState<string>("blank");
  const [brief, setBrief] = useState("");
  const [author, setAuthor] = useState("");

  const create = (): void => {
    const starter = template === "blank" ? undefined : STARTER_TEMPLATES.find((t) => t.id === template);
    // a starter keeps its authored aspect; the picker applies to blank boards
    const sb: Storyboard = starter
      ? starter.build()
      : newStoryboard({ title: title.trim() || "Untitled board", aspect, brief: brief.trim(), author: author.trim() });
    if (starter) {
      if (title.trim()) sb.title = title.trim();
      if (brief.trim()) sb.brief = brief.trim();
      if (author.trim()) sb.author = author.trim();
    }
    onCreate(sb);
  };

  return (
    <Dialog
      title="New storyboard"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={create}>
            Create board
          </button>
        </>
      }
    >
      <label className="field">
        <span>Title</span>
        <input value={title} maxLength={120} placeholder="Untitled board" onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="field">
        <span>Aspect ratio</span>
        <div className="aspect-cards" role="group" aria-label="Aspect ratio">
          {ASPECT_RATIOS.map((a) => (
            <button key={a} type="button" className="aspect-card" aria-pressed={aspect === a} onClick={() => setAspect(a)}>
              <span className="shape" style={{ aspectRatio: a === "16:9" ? "16/9" : a === "4:3" ? "4/3" : a === "1:1" ? "1/1" : "9/16", width: a === "9:16" ? 22 : 40 }} />
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Start from</span>
        <div className="template-list" role="radiogroup" aria-label="Starting template">
          <button type="button" className="template-row" role="radio" aria-checked={template === "blank"} onClick={() => setTemplate("blank")}>
            <span>
              <span className="t-label">Blank board</span>
              <br />
              <span className="t-desc">One empty frame on your chosen aspect.</span>
            </span>
          </button>
          {STARTER_TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="template-row" role="radio" aria-checked={template === t.id} onClick={() => setTemplate(t.id)}>
              <span>
                <span className="t-label">{t.label}</span>
                <br />
                <span className="t-desc">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Brief (optional)</span>
        <textarea rows={2} maxLength={600} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What is this sequence for?" />
      </label>
      <label className="field">
        <span>Author (optional)</span>
        <input value={author} maxLength={80} onChange={(e) => setAuthor(e.target.value)} />
      </label>
    </Dialog>
  );
}

export function seedStarters(): Storyboard[] {
  return buildStarterLibrary();
}
