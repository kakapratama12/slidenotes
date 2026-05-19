/**
 * Clamp pan offset for a zoomed slide centered in its container (transform-origin: center).
 * Allows symmetric pan on all sides when content exceeds the viewport.
 */
export function clampPanOffset(panX, panY, containerWidth, containerHeight, contentWidth, contentHeight) {
  let x = panX;
  let y = panY;

  const overflowX = contentWidth - containerWidth;
  if (overflowX > 0) {
    const maxX = overflowX / 2;
    x = Math.max(-maxX, Math.min(maxX, x));
  } else {
    x = 0;
  }

  const overflowY = contentHeight - containerHeight;
  if (overflowY > 0) {
    const maxY = overflowY / 2;
    y = Math.max(-maxY, Math.min(maxY, y));
  } else {
    y = 0;
  }

  return { x, y };
}
