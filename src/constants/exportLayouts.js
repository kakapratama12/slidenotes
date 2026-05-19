export const EXPORT_LAYOUT_STORAGE_KEY = 'slidenotes.exportLayout';

export const EXPORT_LAYOUTS = [
  {
    id: '1-per-page',
    label: '1 per page',
    description: 'One slide and its notes on each page.',
  },
  {
    id: '2-per-page',
    label: '2 per page',
    description: 'Two slides per page with notes below each.',
  },
  {
    id: 'notes-only',
    label: 'Notes only',
    description: 'Text only — slide notes and highlight notes, no images.',
  },
];

export const DEFAULT_EXPORT_LAYOUT = '1-per-page';

export function isValidExportLayout(layout) {
  return EXPORT_LAYOUTS.some((option) => option.id === layout);
}

export function getStoredExportLayout() {
  try {
    const stored = localStorage.getItem(EXPORT_LAYOUT_STORAGE_KEY);
    return isValidExportLayout(stored) ? stored : DEFAULT_EXPORT_LAYOUT;
  } catch {
    return DEFAULT_EXPORT_LAYOUT;
  }
}

export function storeExportLayout(layout) {
  try {
    localStorage.setItem(EXPORT_LAYOUT_STORAGE_KEY, layout);
  } catch {
    // ignore quota / private mode errors
  }
}
