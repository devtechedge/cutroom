import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import * as ops from "../model/ops";
import { commit, initHistory, redo as redoHistory, undo as undoHistory, canRedo, canUndo, type HistoryState } from "./history";
import type { Frame, FrameObject, Storyboard } from "../model/types";

export interface EditorState {
  history: HistoryState;
  frameId: string;
  objectId: string | null;
}

export type SelectionPatch = { frameId?: string; objectId?: string | null };

export type EditorAction =
  | { type: "op"; label: string; now: number; produce: (sb: Storyboard) => Storyboard; select?: SelectionPatch }
  | { type: "select"; frameId?: string; objectId?: string | null }
  | { type: "replace"; sb: Storyboard }
  | { type: "undo" }
  | { type: "redo" };

function clampSelection(sb: Storyboard, frameId: string, objectId: string | null): { frameId: string; objectId: string | null } {
  const frame = sb.frames.find((f) => f.id === frameId) ?? sb.frames.at(0);
  if (!frame) return { frameId: "", objectId: null };
  const oid = objectId !== null && frame.objects.some((o) => o.id === objectId) ? objectId : null;
  return { frameId: frame.id, objectId: oid };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "op": {
      const next = action.produce(state.history.present);
      const history = commit(state.history, next, action.label, action.now);
      const wantFrame = action.select?.frameId ?? state.frameId;
      const wantObject = action.select && "objectId" in action.select ? (action.select.objectId ?? null) : state.objectId;
      const sel = clampSelection(next, wantFrame, wantObject);
      return { history, ...sel };
    }
    case "select": {
      const wantFrame = action.frameId ?? state.frameId;
      const wantObject = "objectId" in action ? (action.objectId ?? null) : state.objectId;
      const sel = clampSelection(state.history.present, wantFrame, wantObject);
      return { ...state, ...sel };
    }
    case "replace": {
      const sel = clampSelection(action.sb, action.sb.frames[0]?.id ?? "", null);
      return { history: initHistory(action.sb), ...sel };
    }
    case "undo": {
      const next = undoHistory(state.history);
      if (next === state.history) return state;
      const sel = clampSelection(next.present, state.frameId, state.objectId);
      return { history: next, ...sel };
    }
    case "redo": {
      const next = redoHistory(state.history);
      if (next === state.history) return state;
      const sel = clampSelection(next.present, state.frameId, state.objectId);
      return { history: next, ...sel };
    }
  }
}

export interface EditorApi {
  sb: Storyboard;
  frame: Frame | null;
  frameIndex: number;
  object: FrameObject | null;
  canUndo: boolean;
  canRedo: boolean;
  select: (frameId?: string, objectId?: string | null) => void;
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
    objectId: null,
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
    const object = frame?.objects.find((o) => o.id === state.objectId) ?? null;
    return {
      sb,
      frame,
      frameIndex,
      object,
      canUndo: canUndo(state.history),
      canRedo: canRedo(state.history),
      select: (frameId, objectId) => dispatch({ type: "select", frameId, objectId }),
      run: (label, produce, select) => dispatch({ type: "op", label, now: Date.now(), produce, select }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      resetHistory: (next) => dispatch({ type: "replace", sb: next }),
    };
  }, [sb, state.frameId, state.objectId, state.history]);

  return <EditorContext.Provider value={api}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorApi {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}

export { ops };
