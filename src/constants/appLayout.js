export const LAYOUT_STORAGE_KEY = 'slidenotes-layout';
export const LAYOUT_DEFAULT = 'default';
export const LAYOUT_ZOOM = 'zoom';

export function getStoredLayout() {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (stored === LAYOUT_ZOOM || stored === LAYOUT_DEFAULT) {
      return stored;
    }
  } catch {
    // ignore
  }

  return LAYOUT_DEFAULT;
}

export function storeLayout(layout) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  } catch {
    // ignore quota / private mode errors
  }
}

export function toggleLayout(layout) {
  return layout === LAYOUT_DEFAULT ? LAYOUT_ZOOM : LAYOUT_DEFAULT;
}
