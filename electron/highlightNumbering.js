function darkenHighlightColor(hex) {
  const normalized = String(hex ?? '#cccccc').replace('#', '');
  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value)) {
    return '#999999';
  }

  const r = Math.round(((value >> 16) & 255) * 0.55);
  const g = Math.round(((value >> 8) & 255) * 0.55);
  const b = Math.round((value & 255) * 0.55);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function sortHighlightsByPosition(highlights) {
  return [...highlights].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
}

function getHighlightNumber(highlights, highlightId) {
  const sorted = sortHighlightsByPosition(highlights);
  const index = sorted.findIndex((highlight) => highlight.id === highlightId);

  return index === -1 ? 0 : index + 1;
}

module.exports = {
  darkenHighlightColor,
  sortHighlightsByPosition,
  getHighlightNumber,
};
