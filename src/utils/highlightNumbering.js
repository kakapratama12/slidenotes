/** Sort highlights top-to-bottom, then left-to-right (position-based numbering). */
export function sortHighlightsByPosition(highlights) {
  return [...highlights].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
}

export function getHighlightNumber(highlights, highlightId) {
  const sorted = sortHighlightsByPosition(highlights);
  const index = sorted.findIndex((highlight) => highlight.id === highlightId);

  return index === -1 ? 0 : index + 1;
}

export function getHighlightMarker(number) {
  return `[${number}] `;
}
