import { HIGHLIGHT_FILL_OPACITY } from '../constants/highlightColors.js';

export function drawHighlightsOnCanvas(ctx, highlights, canvasWidth, canvasHeight) {
  if (!ctx || !highlights?.length) {
    return;
  }

  for (const highlight of highlights) {
    const pixelX = highlight.x * canvasWidth;
    const pixelY = highlight.y * canvasHeight;
    const pixelW = highlight.width * canvasWidth;
    const pixelH = highlight.height * canvasHeight;

    ctx.save();
    ctx.globalAlpha = HIGHLIGHT_FILL_OPACITY;
    ctx.fillStyle = highlight.color;
    ctx.fillRect(pixelX, pixelY, pixelW, pixelH);
    ctx.restore();
  }
}
