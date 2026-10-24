import { type JSX, type ReactNode } from "react";
import { useEditor } from "../state/editor";
import * as ops from "../model/ops";
import { newImageObject } from "../model/defaults";
import { frameHeightUnits, frameNumber } from "../model/geometry";
import { FRAME_BG_SWATCHES, INK_SWATCHES } from "../model/palette";
import { SHOT_TYPES, TRANSITIONS, type Asset, type FrameObject, type ShapeObject, type TextObject } from "../model/types";
import { fileToAsset } from "../lib/assets";
import { Icon, type IconName } from "./Icon";

export interface InspectorProps {
  open: boolean;
  onAddAsset: (asset: Asset) => void;
  onToast: (msg: string) => void;
}

function Field({ label, children, note }: { label: string; children: ReactNode; note?: string }): JSX.Element {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {note && <span className="char-note">{note}</span>}
    </label>
  );
}

function Num({
  label,
  value,
  min,
  max,
  step = 1,
  labelSuffix,
  onValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  labelSuffix?: string;
  onValue: (v: number) => void;
}): JSX.Element {
  return (
    <Field label={`${label}${labelSuffix ?? ""}`}>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onValue(v);
        }}
      />
    </Field>
  );
}

function ColorPicker({
  swatches,
  value,
  allowNone,
  onChange,
  label,
}: {
  swatches: readonly string[];
  value: string;
  allowNone?: boolean;
  onChange: (v: string) => void;
  label: string;
}): JSX.Element {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {allowNone && (
          <button
            type="button"
            className="swatch"
            aria-pressed={value === "none"}
            aria-label="No fill"
            title="No fill"
            onClick={() => onChange("none")}
            style={{ background: "transparent", position: "relative" }}
          >
            <span style={{ position: "absolute", inset: 0, borderRadius: 4, background: "linear-gradient(135deg, transparent 44%, #c96f4a 46%, #c96f4a 54%, transparent 56%)" }} />
          </button>
        )}
        {swatches.map((c) => (
          <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={value === c} aria-label={`Color ${c}`} onClick={() => onChange(c)} />
        ))}
        <input type="color" value={value === "none" ? "#ffffff" : value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} custom color`} />
      </div>
    </div>
  );
}

const KIND_META: Record<FrameObject["kind"], { icon: IconName; label: string }> = {
  image: { icon: "image", label: "Image" },
  shape: { icon: "shape", label: "Shape" },
  text: { icon: "text", label: "Text" },
};

export function Inspector({ open, onAddAsset, onToast }: InspectorProps): JSX.Element {
  const ed = useEditor();
  const { sb, frame, object, frameIndex } = ed;
  const multi = ed.objectIds.length > 1;
  if (!frame) {
    return <aside className="inspector" data-open={open} aria-label="Inspector" />;
  }

  const runFrame = (label: string, patch: Parameters<typeof ops.setFrameMeta>[2]): void =>
    ed.run(label, (sbNow) => ops.setFrameMeta(sbNow, frame.id, patch));

  const runObject = (label: string, patch: Partial<FrameObject>): void => {
    if (!object) return;
    ed.run(label, (sbNow) => ops.updateObject(sbNow, frame.id, object.id, patch));
  };

  const duplicateSelection = (): void => {
    const copies = ops.cloneObjects(ed.objects);
    if (copies.length === 0) return;
    ed.run("duplicate-objects", (sbNow) => ops.addObjects(sbNow, frame.id, copies), { objectIds: copies.map((o) => o.id) });
  };

  const deleteSelection = (): void => {
    ed.run("remove-objects", (sbNow) => ops.removeObjects(sbNow, frame.id, ed.objectIds), { objectIds: [] });
  };

  const pickImage = (replaceObjectId?: string): void => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const asset = await fileToAsset(file);
        onAddAsset(asset);
        if (replaceObjectId) {
          runObject("replace-image", { assetId: asset.id });
          onToast(`Replaced with “${file.name}”.`);
        } else {
          const ratio = asset.width / Math.max(asset.height, 1);
          const w = Math.min(720, Math.max(120, Math.round(ratio * 300)));
          const h = Math.min(520, Math.round(w / Math.max(ratio, 0.2)));
          const obj = newImageObject(asset.id, { x: (1000 - w) / 2, y: Math.max(40, (frameHeightUnits(sb.aspect) - h) / 2 - 40), w, h });
          ed.run("add-object", (sbNow) => ops.addObject(sbNow, frame.id, obj), { objectId: obj.id });
          onToast(`Added “${file.name}” (stored locally in this browser).`);
        }
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Could not add that image.");
      }
    };
    input.click();
  };

  return (
    <aside className="inspector scroll-hover" data-open={open} aria-label="Inspector">
      <div className="inspector-inner">
        {multi ? (
          <>
            <h2>Selection</h2>
            <p className="selection-copy">
              {ed.objectIds.length} objects selected. Drag any selected object to move the group, or use the arrow keys. Styling applies to one object at a
              time.
            </p>
            <div className="row">
              <button type="button" className="btn small" onClick={duplicateSelection}>
                <Icon name="layers" size={13} />
                Duplicate
              </button>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn small danger" onClick={deleteSelection}>
                <Icon name="trash" size={13} />
                Delete all
              </button>
            </div>
            <hr className="rule" />
            <p className="selection-copy">Select a single object to edit its size, color and content.</p>
          </>
        ) : object ? (
          <>
            <h2>Object</h2>
            <div className="obj-kind">
              <Icon name={KIND_META[object.kind].icon} />
              {KIND_META[object.kind].label}
            </div>

            <div className="field-grid">
              <Num label="X" value={object.x} min={0} max={1000} onValue={(v) => runObject("edit-geometry", { x: v })} />
              <Num label="Y" value={object.y} min={0} max={1000} onValue={(v) => runObject("edit-geometry", { y: v })} />
              <Num label="W" value={object.w} min={1} max={1000} onValue={(v) => runObject("edit-geometry", { w: v })} />
              <Num label="H" value={object.h} min={0} max={1000} onValue={(v) => runObject("edit-geometry", { h: v })} />
            </div>

            <Field label={`Opacity (${Math.round(object.opacity * 100)}%)`}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(object.opacity * 100)}
                onChange={(e) => runObject("edit-opacity", { opacity: Number(e.target.value) / 100 })}
              />
            </Field>

            <div className="row">
              <button type="button" className="icon-btn" aria-label="Bring to front" title="Bring to front" onClick={() => ed.run("z-order", (s) => ops.moveObjectZ(s, frame.id, object.id, "front"))}>
                <Icon name="front" />
              </button>
              <button type="button" className="icon-btn" aria-label="Send to back" title="Send to back" onClick={() => ed.run("z-order", (s) => ops.moveObjectZ(s, frame.id, object.id, "back"))}>
                <Icon name="back" />
              </button>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                className="btn small danger"
                onClick={() => ed.run("remove-object", (s) => ops.removeObject(s, frame.id, object.id), { objectId: null })}
              >
                <Icon name="trash" size={13} />
                Delete object
              </button>
            </div>

            {object.kind === "image" && (
              <>
                <hr className="rule" />
                <Field label="Image fit">
                  <div className="seg" role="group" aria-label="Image fit">
                    {(["contain", "cover"] as const).map((f) => (
                      <button key={f} type="button" aria-pressed={object.fit === f} onClick={() => runObject("edit-fit", { fit: f })}>
                        {f}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="field-grid">
                  <Num label="Border" value={object.borderWidth} min={0} max={40} onValue={(v) => runObject("edit-border", { borderWidth: v })} />
                  <Num label="Corners" value={object.cornerRadius} min={0} max={48} onValue={(v) => runObject("edit-radius", { cornerRadius: v })} />
                </div>
                <ColorPicker label="Border color" swatches={INK_SWATCHES} value={object.borderColor} onChange={(c) => runObject("edit-border-color", { borderColor: c })} />
                <button type="button" className="btn small" onClick={() => pickImage(object.id)}>
                  <Icon name="image" size={13} />
                  Replace image file
                </button>
              </>
            )}

            {object.kind === "shape" && (
              <>
                <hr className="rule" />
                <Field label="Shape">
                  <select value={object.shape} onChange={(e) => runObject("edit-shape", { shape: e.target.value as ShapeObject["shape"] })}>
                    <option value="rect">Rectangle</option>
                    <option value="ellipse">Ellipse</option>
                    <option value="triangle">Triangle</option>
                    <option value="line">Line</option>
                  </select>
                </Field>
                <ColorPicker label="Fill" swatches={INK_SWATCHES} value={object.fill} allowNone onChange={(c) => runObject("edit-fill", { fill: c })} />
                <div className="field-grid">
                  <Num label="Stroke" value={object.strokeWidth} min={0} max={40} onValue={(v) => runObject("edit-stroke", { strokeWidth: v })} />
                  {object.shape === "rect" && <Num label="Corners" value={object.cornerRadius} min={0} max={48} onValue={(v) => runObject("edit-radius", { cornerRadius: v })} />}
                </div>
                <ColorPicker label="Stroke color" swatches={INK_SWATCHES} value={object.strokeColor} onChange={(c) => runObject("edit-stroke-color", { strokeColor: c })} />
              </>
            )}

            {object.kind === "text" && (
              <>
                <hr className="rule" />
                <Field label="Text (Enter for a new line)" note={`${object.text.length}/800`}>
                  <textarea
                    value={object.text}
                    maxLength={800}
                    rows={3}
                    onChange={(e) => runObject("edit-text", { text: e.target.value })}
                  />
                </Field>
                <div className="field-grid">
                  <Field label="Font">
                    <select value={object.font} onChange={(e) => runObject("edit-font", { font: e.target.value as TextObject["font"] })}>
                      <option value="grotesk">Grotesk</option>
                      <option value="serif">Serif</option>
                      <option value="mono">Mono</option>
                    </select>
                  </Field>
                  <Field label="Align">
                    <div className="seg" role="group" aria-label="Text align">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button key={a} type="button" aria-pressed={object.align === a} onClick={() => runObject("edit-align", { align: a })}>
                          {a === "left" ? "L" : a === "center" ? "C" : "R"}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Num label="Size" value={object.size} min={8} max={220} onValue={(v) => runObject("edit-size", { size: v })} />
                  <Field label="Weight">
                    <select value={object.weight} onChange={(e) => runObject("edit-weight", { weight: Number(e.target.value) })}>
                      {[300, 400, 500, 600, 700, 800].map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Num label="Line height" value={object.lineHeight} min={0.9} max={2} step={0.05} onValue={(v) => runObject("edit-line-height", { lineHeight: v })} />
                  <Num label="Tracking" value={object.letterSpacing} min={-0.04} max={0.4} step={0.01} onValue={(v) => runObject("edit-tracking", { letterSpacing: v })} />
                </div>
                <ColorPicker label="Color" swatches={INK_SWATCHES} value={object.color} onChange={(c) => runObject("edit-color", { color: c })} />
              </>
            )}
          </>
        ) : (
          <>
            <h2>Frame {frameNumber(frameIndex)}</h2>
            <ColorPicker label="Background" swatches={FRAME_BG_SWATCHES} value={frame.background} onChange={(c) => runFrame("edit-background", { background: c })} />
            <div className="field-grid">
              <Field label="Shot type">
                <select value={frame.shot} onChange={(e) => runFrame("edit-shot", { shot: e.target.value as typeof frame.shot })}>
                  <option value="">None</option>
                  {SHOT_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Num label="Hold" labelSuffix=" s" value={frame.duration} min={0.5} max={30} step={0.5} onValue={(v) => runFrame("edit-duration", { duration: v })} />
            </div>
            <Field label="Transition in">
              <select value={frame.transitionIn} onChange={(e) => runFrame("edit-transition", { transitionIn: e.target.value as typeof frame.transitionIn })}>
                {TRANSITIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Caption (what the audience reads)" note={`${frame.caption.text.length}/300`}>
              <textarea
                value={frame.caption.text}
                maxLength={300}
                rows={2}
                onChange={(e) => runFrame("edit-caption", { caption: { ...frame.caption, text: e.target.value } })}
              />
            </Field>
            <div className="checkbox-row">
              <input id="cap-visible" type="checkbox" checked={frame.caption.visible} onChange={(e) => runFrame("edit-caption-visibility", { caption: { ...frame.caption, visible: e.target.checked } })} />
              <label htmlFor="cap-visible">Show caption on stage, preview, and exports</label>
            </div>
            <Field label="Production notes (crew-facing, not exported on art)" note={`${frame.notes.length}/2000`}>
              <textarea value={frame.notes} maxLength={2000} rows={4} onChange={(e) => runFrame("edit-notes", { notes: e.target.value })} />
            </Field>
            <div className="checkbox-row">
              <input id="guides" type="checkbox" checked={frame.guides} onChange={(e) => runFrame("edit-guides", { guides: e.target.checked })} />
              <label htmlFor="guides">Framing guides (editor only)</label>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
