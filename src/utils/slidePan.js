export function clampPanOffset(panX, panY, containerWidth, containerHeight, contentWidth, contentHeight) {
  let x = panX;
  let y = panY;

  if (contentWidth <= containerWidth) {
    x = 0;
  } else {
    const minX = containerWidth - contentWidth;
    x = Math.max(minX, Math.min(0, x));
  }

  if (contentHeight <= containerHeight) {
    y = 0;
  } else {
    const minY = containerHeight - contentHeight;
    y = Math.max(minY, Math.min(0, y));
  }

  return { x, y };
}
