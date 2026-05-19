export const ZOOM_HIGHLIGHT_WIDTH_KEY = 'slidenotes-zoom-highlight-width';
export const DEFAULT_ZOOM_HIGHLIGHT_WIDTH = 35;
export const MIN_ZOOM_HIGHLIGHT_WIDTH = 20;
export const MAX_ZOOM_HIGHLIGHT_WIDTH = 55;

export function clampZoomHighlightWidth(width) {
  return Math.min(MAX_ZOOM_HIGHLIGHT_WIDTH, Math.max(MIN_ZOOM_HIGHLIGHT_WIDTH, width));
}

export function getStoredZoomHighlightWidth() {
  try {
    const stored = Number.parseFloat(localStorage.getItem(ZOOM_HIGHLIGHT_WIDTH_KEY));
    if (Number.isNaN(stored)) {
      return DEFAULT_ZOOM_HIGHLIGHT_WIDTH;
    }

    return clampZoomHighlightWidth(stored);
  } catch {
    return DEFAULT_ZOOM_HIGHLIGHT_WIDTH;
  }
}

export function storeZoomHighlightWidth(width) {
  try {
    localStorage.setItem(ZOOM_HIGHLIGHT_WIDTH_KEY, String(clampZoomHighlightWidth(width)));
  } catch {
    // ignore quota / private mode errors
  }
}
