export const ZOOM_HIGHLIGHT_WIDTH_KEY = 'slidenotes-zoom-highlight-width';
export const DEFAULT_ZOOM_HIGHLIGHT_WIDTH = 35;
export const MIN_ZOOM_HIGHLIGHT_WIDTH = 20;
export const MAX_ZOOM_HIGHLIGHT_WIDTH = 55;

/** Slide area vs bottom panel height ratio in zoom layout (3:2 = 60% / 40%). */
export const ZOOM_SLIDE_PANEL_FLEX = 3;
export const ZOOM_BOTTOM_PANEL_FLEX = 2;

export function clampZoomHighlightWidth(width) {
  return Math.min(MAX_ZOOM_HIGHLIGHT_WIDTH, Math.max(MIN_ZOOM_HIGHLIGHT_WIDTH, width));
}

export function getStoredZoomHighlightWidth() {
  try {
    const stored = Number.parseFloat(localStorage.getItem(ZOOM_HIGHLIGHT_WIDTH_KEY));

    if (!Number.isNaN(stored)) {
      return clampZoomHighlightWidth(stored);
    }
  } catch {
    // ignore
  }

  return DEFAULT_ZOOM_HIGHLIGHT_WIDTH;
}

export function storeZoomHighlightWidth(width) {
  try {
    localStorage.setItem(ZOOM_HIGHLIGHT_WIDTH_KEY, String(clampZoomHighlightWidth(width)));
  } catch {
    // ignore quota / private mode errors
  }
}
