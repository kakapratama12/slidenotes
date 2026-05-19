export const NOTES_PANEL_WIDTH_KEY = 'slidenotes-notes-panel-width';
export const DEFAULT_NOTES_PANEL_WIDTH = 35;
export const MIN_NOTES_PANEL_WIDTH = 20;
export const MAX_NOTES_PANEL_WIDTH = 50;

export function clampNotesPanelWidth(width) {
  return Math.min(MAX_NOTES_PANEL_WIDTH, Math.max(MIN_NOTES_PANEL_WIDTH, width));
}

export function getStoredNotesPanelWidth() {
  try {
    const stored = Number.parseFloat(localStorage.getItem(NOTES_PANEL_WIDTH_KEY));
    if (Number.isNaN(stored)) {
      return DEFAULT_NOTES_PANEL_WIDTH;
    }

    return clampNotesPanelWidth(stored);
  } catch {
    return DEFAULT_NOTES_PANEL_WIDTH;
  }
}

export function storeNotesPanelWidth(width) {
  try {
    localStorage.setItem(NOTES_PANEL_WIDTH_KEY, String(clampNotesPanelWidth(width)));
  } catch {
    // ignore quota / private mode errors
  }
}
