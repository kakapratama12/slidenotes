import { HIGHLIGHT_COLORS } from './highlightColors.js';

export const CURSOR_TOOL = 'cursor';

/** @typedef {'cursor' | 'yellow' | 'green' | 'red' | 'blue' | 'purple'} HighlightTool */

export function toolToDrawColor(activeTool) {
  if (activeTool === CURSOR_TOOL) {
    return null;
  }

  return HIGHLIGHT_COLORS.find((color) => color.id === activeTool)?.hex ?? null;
}

export function isDrawTool(activeTool) {
  return activeTool !== CURSOR_TOOL;
}
