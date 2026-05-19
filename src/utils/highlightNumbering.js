/** Sort highlights top-to-bottom, then left-to-right (position-based numbering). */
export function sortHighlightsByPosition(highlights) {
  return [...highlights].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
}

/**
 * @param {Array} highlights
 * @param {string | { id?: string }} highlightOrId - highlight id or highlight object
 */
export function getHighlightNumber(highlights, highlightOrId) {
  const sorted = sortHighlightsByPosition(highlights);
  const targetId = typeof highlightOrId === 'string' ? highlightOrId : highlightOrId?.id;
  const targetRef = typeof highlightOrId === 'object' ? highlightOrId : null;

  const index = sorted.findIndex((highlight) => {
    if (targetId && highlight.id) {
      return highlight.id === targetId;
    }

    return targetRef != null && highlight === targetRef;
  });

  return index === -1 ? 0 : index + 1;
}

export function getHighlightMarker(number) {
  return `[${number}] `;
}
