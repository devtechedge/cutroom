import type { Storyboard } from "../model/types";

export interface HistoryState {
  past: Storyboard[];
  present: Storyboard;
  future: Storyboard[];
  /** Label of the most recent commit, used to coalesce runs of typing. */
  lastLabel: string;
  lastAt: number;
}

export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 600;

export function initHistory(sb: Storyboard): HistoryState {
  return { past: [], present: sb, future: [], lastLabel: "", lastAt: 0 };
}

/**
 * Push the next present. Same-label commits inside the coalesce window
 * replace the present without growing the past (typing, slider drags).
 * Any commit clears the redo branch.
 */
export function commit(h: HistoryState, next: Storyboard, label: string, now: number): HistoryState {
  const coalesce = label === h.lastLabel && now - h.lastAt < COALESCE_MS;
  if (coalesce) {
    return { ...h, present: next, lastAt: now };
  }
  const past = [...h.past, h.present];
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    present: next,
    future: [],
    lastLabel: label,
    lastAt: now,
  };
}

export function canUndo(h: HistoryState): boolean {
  return h.past.length > 0;
}

export function canRedo(h: HistoryState): boolean {
  return h.future.length > 0;
}

export function undo(h: HistoryState): HistoryState {
  if (h.past.length === 0) return h;
  const past = [...h.past];
  const present = past.pop() as Storyboard;
  return { past, present, future: [...h.future, h.present], lastLabel: "", lastAt: 0 };
}

export function redo(h: HistoryState): HistoryState {
  if (h.future.length === 0) return h;
  const future = [...h.future];
  const present = future.pop() as Storyboard;
  return { past: [...h.past, h.present], present, future, lastLabel: "", lastAt: 0 };
}
