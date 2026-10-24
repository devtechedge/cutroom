import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import * as ops from "../model/ops";
import { commit, initHistory, redo as redoHistory, undo as undoHistory, canRedo, canUndo, type HistoryState } from "./history";
import type { Frame, FrameObject, Storyboard } from "../model/types";

export interface EditorState {
  history: HistoryState;
  frameId: string;
  objectIds: string[];
}

export type SelectionPatch = { frameId?: string; objectId?: string | null; objectIds?: string[] };

export type EditorAction =
  | { type: "op"; label: string; now: number; produce: (sb: Storyboard) => Storyboard; select?: SelectionPatch }
  | { type: "select"; frameId?: string; objectId?: string | null; objectIds?: string[]; additive?: boolean }
  | { type: "replace"; sb: Storyboard }
  | { type: "undo" }
  | { type: "redo" };

function clampSelection(sb: Storyboard, frameId: string, objectIds: readonly string[]): { frameId: string; objectIds: string[] } {
  const frame = sb.frames.find((f) => f.id === frameId) ?? sb.frames.at(0);
  if (!frame) return { frameId: "", objectIds: [] };
  const seen = new Set<string>();
  const ids = objectIds.filter((id) => {
    if (seen.has(id) || !frame.objects.some((o) => o.id === id)) return false;
    seen.add(id);
    return true;
  });
  return { frameId: frame.id, objectIds: ids };
}

function patchSelection(patch: SelectionPatch): string[] | null {
  if (patch.objectIds) return patch.objectIds;
  if ("objectId" in patch) return patch.objectId ? [patch.objectId] : [];
  return null;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "op": {
      const next = action.produce(state.history.present);
      const history = commit(state.history, next, action.label, action.now);
      const wantFrame = action.select?.frameId ?? state.frameId;
      const wanted = action.select ? patchSelection(action.select) : null;
      const sel = clampSelection(next, wantFrame, wanted ?? state.objectIds);
      return { history, ...sel };
    }
    case "select": {
      const wantFrame = action.frameId ?? state.frameId;
      let ids: string[];
      if (action.additive) {
        const current = wantFrame === state.frameId ? state.objectIds : [];
        const target = action.objectId;
        ids = target ? (current.includes(target) ? current.filter((id) => id !== target) : [...current, target]) : current;
      } else if (action.objectIds) {
        ids = action.objectIds;
      } else {
        ids = action.objectId ? [action.objectId] : [];
      }
      const sel = clampSelection(state.history.present, wantFrame, ids);
      return { ...state, ...sel };
    }
    case "replace": {
      const sel = clampSelection(action.sb, action.sb.frames[0]?.id ?? "", []);
      return { history: initHistory(action.sb), ...sel };
    }
    case "undo": {
      const next = undoHistory(state.history);
      if (next === state.history) return state;
      const sel = clampSelection(next.present, state.frameId, state.objectIds);
      return { history: next, ...sel };
    }
    case "redo": {
      const next = redoHistory(state.history);
      if (next === state.history) return state;
      const sel = clampSelection(next.present, state.frameId, state.objectIds);
      return { history: next, ...sel };
    }
  }
}

export interface EditorApi {
  sb: Storyboard;
  frame: Frame | null;
  frameIndex: number;
  object: FrameObject | null;
  objects: FrameObject[];
  objectIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  select: (frameId?: string, objectId?: string | null, additive?: boolean) => void;
  selectMany: (objectIds: string[], frameId?: string) => void;
  clearSelection: () => void;
  run: (label: string, produce: (sb: Storyboard) => Storyboard, select?: SelectionPatch) => void;
  undo: () => void;
  redo: () => void;
  /** Swap the whole project (import) and drop all history. */
  resetHistory: (sb: Storyboard) => void;
}

const EditorContext = createContext<EditorApi | null>(null);

export function EditorProvider({
  project,
  onCommit,
  children,
}: {
  project: Storyboard;
  onCommit?: (sb: Storyboard) => void;
  children: ReactNode;
}): ReactNode {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => ({
    history: initHistory(project),
    frameId: project.frames[0]?.id ?? "",
    objectIds: [],
  }));

  const sb = state.history.present;

  // Report every committed present (ops, undo, redo) upward for autosave.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onCommit?.(sb);
  }, [sb, onCommit]);

  const api = useMemo<EditorApi>(() => {
    const frame = sb.frames.find((f) => f.id === state.frameId) ?? null;
    const frameIndex = frame ? sb.frames.indexOf(frame) : -1;
    const objects = frame
      ? state.objectIds.map((id) => frame.objects.find((o) => o.id === id)).filter((o): o is FrameObject => Boolean(o))
      : [];
    const object = objects.at(-1) ?? null;
    return {
      sb,
      frame,
      frameIndex,
      object,
      objects,
      objectIds: state.objectIds,
      canUndo: canUndo(state.history),
      canRedo: canRedo(state.history),
      select: (frameId, objectId, additive) => dispatch({ type: "select", frameId, objectId, additive }),
      selectMany: (objectIds, frameId) => dispatch({ type: "select", frameId, objectIds }),
      clearSelection: () => dispatch({ type: "select", objectId: null }),
      run: (label, produce, select) => dispatch({ type: "op", label, now: Date.now(), produce, select }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      resetHistory: (next) => dispatch({ type: "replace", sb: next }),
    };
  }, [sb, state.frameId, state.objectIds, state.history]);

  return <EditorContext.Provider value={api}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorApi {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}

export { ops };
