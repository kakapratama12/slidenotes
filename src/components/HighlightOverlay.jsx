import { useCallback, useRef, useState } from 'react';
import { HIGHLIGHT_FILL_OPACITY } from '../constants/highlightColors.js';

const MIN_DRAG_PX = 4;

function normalizeRect(x1, y1, x2, y2, width, height) {
  const x = Math.min(x1, x2) / width;
  const y = Math.min(y1, y2) / height;
  const w = Math.abs(x2 - x1) / width;
  const h = Math.abs(y2 - y1) / height;

  return { x, y, width: w, height: h };
}

function getLocalPoint(event, svgElement) {
  const rect = svgElement.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export default function HighlightOverlay({
  width,
  height,
  highlights,
  drawColor,
  selectedId,
  onSelect,
  onCreate,
}) {
  const svgRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const drawMode = Boolean(drawColor);

  const handlePointerDown = useCallback(
    (event) => {
      if (!drawMode || !svgRef.current || width === 0 || height === 0) {
        return;
      }

      if (event.target !== svgRef.current) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      const point = getLocalPoint(event, svgRef.current);
      setDraft({ startX: point.x, startY: point.y, currentX: point.x, currentY: point.y });
    },
    [drawMode, width, height],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!draft) {
        return;
      }

      const point = getLocalPoint(event, svgRef.current);
      setDraft((prev) =>
        prev ? { ...prev, currentX: point.x, currentY: point.y } : prev,
      );
    },
    [draft],
  );

  const handlePointerUp = useCallback(
    (event) => {
      if (!draft || !drawColor) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);

      const dragWidth = Math.abs(draft.currentX - draft.startX);
      const dragHeight = Math.abs(draft.currentY - draft.startY);

      if (dragWidth >= MIN_DRAG_PX && dragHeight >= MIN_DRAG_PX) {
        const rect = normalizeRect(
          draft.startX,
          draft.startY,
          draft.currentX,
          draft.currentY,
          width,
          height,
        );

        onCreate({
          id: crypto.randomUUID(),
          ...rect,
          color: drawColor,
        });
      }

      setDraft(null);
    },
    [draft, drawColor, width, height, onCreate],
  );

  const handlePointerCancel = useCallback(() => {
    setDraft(null);
  }, []);

  if (width === 0 || height === 0) {
    return null;
  }

  const draftRect = draft
    ? normalizeRect(draft.startX, draft.startY, draft.currentX, draft.currentY, width, height)
    : null;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="absolute left-0 top-0 touch-none"
      style={{ cursor: drawMode ? 'crosshair' : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {highlights.map((highlight) => {
        const isSelected = highlight.id === selectedId;
        const pixelX = highlight.x * width;
        const pixelY = highlight.y * height;
        const pixelW = highlight.width * width;
        const pixelH = highlight.height * height;

        return (
          <rect
            key={highlight.id}
            x={pixelX}
            y={pixelY}
            width={pixelW}
            height={pixelH}
            fill={highlight.color}
            fillOpacity={HIGHLIGHT_FILL_OPACITY}
            stroke={isSelected ? '#1e293b' : highlight.color}
            strokeWidth={isSelected ? 2 : 1}
            style={{ pointerEvents: drawMode ? 'none' : 'auto' }}
            onPointerDown={(event) => {
              if (drawMode) {
                return;
              }

              event.stopPropagation();
              onSelect(highlight.id);
            }}
          />
        );
      })}

      {draftRect && drawColor && (
        <rect
          x={draftRect.x * width}
          y={draftRect.y * height}
          width={draftRect.width * width}
          height={draftRect.height * height}
          fill={drawColor}
          fillOpacity={HIGHLIGHT_FILL_OPACITY}
          stroke={drawColor}
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
