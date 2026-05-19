export const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#FDE047', label: 'Yellow' },
  { id: 'green', hex: '#86EFAC', label: 'Green' },
  { id: 'red', hex: '#FCA5A5', label: 'Red' },
  { id: 'blue', hex: '#93C5FD', label: 'Blue' },
  { id: 'purple', hex: '#C4B5FD', label: 'Purple' },
];

export const HIGHLIGHT_FILL_OPACITY = 0.4;

export function getHighlightStrokeColor(hex, isSelected) {
  if (!isSelected) {
    return hex;
  }

  return darkenHighlightColor(hex);
}

export function darkenHighlightColor(hex) {
  const r = Math.round(Number.parseInt(hex.slice(1, 3), 16) * 0.55);
  const g = Math.round(Number.parseInt(hex.slice(3, 5), 16) * 0.55);
  const b = Math.round(Number.parseInt(hex.slice(5, 7), 16) * 0.55);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
