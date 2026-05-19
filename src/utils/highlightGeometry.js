export const MIN_HIGHLIGHT_SIZE = 0.02;
export const HANDLE_SIZE = 8;

export const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export const HANDLE_CURSORS = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

export function clampHighlight({ x, y, width, height }) {
  let w = Math.max(MIN_HIGHLIGHT_SIZE, width);
  let h = Math.max(MIN_HIGHLIGHT_SIZE, height);
  let nx = x;
  let ny = y;

  if (nx < 0) {
    nx = 0;
  }

  if (ny < 0) {
    ny = 0;
  }

  if (nx + w > 1) {
    nx = 1 - w;
  }

  if (ny + h > 1) {
    ny = 1 - h;
  }

  return { x: nx, y: ny, width: w, height: h };
}

export function moveHighlight(original, deltaX, deltaY) {
  return clampHighlight({
    x: original.x + deltaX,
    y: original.y + deltaY,
    width: original.width,
    height: original.height,
  });
}

export function resizeHighlight(original, handle, pointerNorm) {
  let { x, y, width: w, height: h } = original;
  const right = x + w;
  const bottom = y + h;
  const px = pointerNorm.x;
  const py = pointerNorm.y;

  switch (handle) {
    case 'nw':
      x = px;
      y = py;
      w = right - x;
      h = bottom - y;
      break;
    case 'n':
      y = py;
      h = bottom - y;
      break;
    case 'ne':
      y = py;
      w = px - x;
      h = bottom - y;
      break;
    case 'e':
      w = px - x;
      break;
    case 'se':
      w = px - x;
      h = py - y;
      break;
    case 's':
      h = py - y;
      break;
    case 'sw':
      x = px;
      w = right - x;
      h = py - y;
      break;
    case 'w':
      x = px;
      w = right - x;
      break;
    default:
      break;
  }

  if (w < 0) {
    x += w;
    w = -w;
  }

  if (h < 0) {
    y += h;
    h = -h;
  }

  return clampHighlight({ x, y, width: w, height: h });
}

/**
 * Resize from drag start using normalized deltas (avoids jump on first move).
 */
export function resizeHighlightByDelta(original, handle, deltaX, deltaY) {
  let { x, y, width: w, height: h } = original;

  switch (handle) {
    case 'nw':
      x = original.x + deltaX;
      y = original.y + deltaY;
      w = original.width - deltaX;
      h = original.height - deltaY;
      break;
    case 'n':
      y = original.y + deltaY;
      h = original.height - deltaY;
      break;
    case 'ne':
      y = original.y + deltaY;
      w = original.width + deltaX;
      h = original.height - deltaY;
      break;
    case 'e':
      w = original.width + deltaX;
      break;
    case 'se':
      w = original.width + deltaX;
      h = original.height + deltaY;
      break;
    case 's':
      h = original.height + deltaY;
      break;
    case 'sw':
      x = original.x + deltaX;
      w = original.width - deltaX;
      h = original.height + deltaY;
      break;
    case 'w':
      x = original.x + deltaX;
      w = original.width - deltaX;
      break;
    default:
      break;
  }

  if (w < 0) {
    x += w;
    w = -w;
  }

  if (h < 0) {
    y += h;
    h = -h;
  }

  return clampHighlight({ x, y, width: w, height: h });
}

export function getHandleCenter(handle, pixelX, pixelY, pixelW, pixelH) {
  switch (handle) {
    case 'nw':
      return { x: pixelX, y: pixelY };
    case 'n':
      return { x: pixelX + pixelW / 2, y: pixelY };
    case 'ne':
      return { x: pixelX + pixelW, y: pixelY };
    case 'e':
      return { x: pixelX + pixelW, y: pixelY + pixelH / 2 };
    case 'se':
      return { x: pixelX + pixelW, y: pixelY + pixelH };
    case 's':
      return { x: pixelX + pixelW / 2, y: pixelY + pixelH };
    case 'sw':
      return { x: pixelX, y: pixelY + pixelH };
    case 'w':
      return { x: pixelX, y: pixelY + pixelH / 2 };
    default:
      return { x: pixelX, y: pixelY };
  }
}
