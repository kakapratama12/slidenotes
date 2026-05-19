import { useCallback, useEffect, useRef, useState } from 'react';
import { HIGHLIGHT_FILL_OPACITY } from '../constants/highlightColors.js';
import HighlightPopup from './HighlightPopup.jsx';

const MIN_DRAG_PX = 4;
const SHOW_DELAY_MS = 200;
const HIDE_DELAY_MS = 300;

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

function hasNoteText(note) {
  return Boolean(note?.trim());
}

export default function HighlightOverlay({
  width,
  height,
  highlights,
  drawColor,
  selectedId,
  onSelect,
  onCreate,
  onUpdateHighlightNote,
  onDeleteHighlight,
}) {
  const svgRef = useRef(null);
  const rectRefs = useRef({});
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const activeHighlightIdRef = useRef(null);
  const drawMode = Boolean(drawColor);

  useEffect(() => {
    activeHighlightIdRef.current = activeHighlightId;
  }, [activeHighlightId]);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const updateAnchorForHighlight = useCallback((highlightId) => {
    const element = rectRefs.current[highlightId];
    if (element) {
      setAnchorRect(element.getBoundingClientRect());
    }
  }, []);

  const openPopupForHighlight = useCallback(
    (highlightId) => {
      setActiveHighlightId(highlightId);
      updateAnchorForHighlight(highlightId);
    },
    [updateAnchorForHighlight],
  );

  const scheduleHidePopup = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setActiveHighlightId(null);
      setAnchorRect(null);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer]);

  const handleHighlightEnter = useCallback(
    (highlightId) => {
      if (drawMode) {
        return;
      }

      clearHideTimer();
      clearShowTimer();

      if (activeHighlightIdRef.current) {
        openPopupForHighlight(highlightId);
        return;
      }

      showTimerRef.current = setTimeout(() => {
        openPopupForHighlight(highlightId);
      }, SHOW_DELAY_MS);
    },
    [drawMode, clearHideTimer, clearShowTimer, openPopupForHighlight],
  );

  const handleHighlightLeave = useCallback(() => {
    clearShowTimer();
    scheduleHidePopup();
  }, [clearShowTimer, scheduleHidePopup]);

  const handlePopupEnter = useCallback(() => {
    clearHideTimer();
  }, [clearHideTimer]);

  const handlePopupLeave = useCallback(() => {
    scheduleHidePopup();
  }, [scheduleHidePopup]);

  useEffect(() => {
    clearShowTimer();
    clearHideTimer();
    setActiveHighlightId(null);
    setAnchorRect(null);
  }, [width, height, drawColor, clearShowTimer, clearHideTimer]);

  useEffect(
    () => () => {
      clearShowTimer();
      clearHideTimer();
    },
    [clearShowTimer, clearHideTimer],
  );

  useEffect(() => {
    if (!activeHighlightId) {
      return;
    }

    updateAnchorForHighlight(activeHighlightId);
  }, [activeHighlightId, highlights, width, height, updateAnchorForHighlight]);

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
          note: '',
        });
      }

      setDraft(null);
    },
    [draft, drawColor, width, height, onCreate],
  );

  const handlePointerCancel = useCallback(() => {
    setDraft(null);
  }, []);

  const activeHighlight = highlights.find((item) => item.id === activeHighlightId);

  const handleDeleteActive = () => {
    if (!activeHighlightId) {
      return;
    }

    clearShowTimer();
    clearHideTimer();
    setActiveHighlightId(null);
    setAnchorRect(null);
    onDeleteHighlight(activeHighlightId);
  };

  if (width === 0 || height === 0) {
    return null;
  }

  const draftRect = draft
    ? normalizeRect(draft.startX, draft.startY, draft.currentX, draft.currentY, width, height)
    : null;

  return (
    <>
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
          const showNoteDot = hasNoteText(highlight.note);

          return (
            <g key={highlight.id}>
              <rect
                ref={(element) => {
                  if (element) {
                    rectRefs.current[highlight.id] = element;
                  } else {
                    delete rectRefs.current[highlight.id];
                  }
                }}
                x={pixelX}
                y={pixelY}
                width={pixelW}
                height={pixelH}
                fill={highlight.color}
                fillOpacity={HIGHLIGHT_FILL_OPACITY}
                stroke={isSelected ? '#1e293b' : highlight.color}
                strokeWidth={isSelected ? 2 : 1}
                style={{ pointerEvents: drawMode ? 'none' : 'auto' }}
                onMouseEnter={() => handleHighlightEnter(highlight.id)}
                onMouseLeave={handleHighlightLeave}
                onPointerDown={(event) => {
                  if (drawMode) {
                    return;
                  }

                  event.stopPropagation();
                  onSelect(highlight.id);
                }}
              />
              {showNoteDot && (
                <circle
                  cx={pixelX + pixelW - 6}
                  cy={pixelY + 6}
                  r={4}
                  fill="#ffffff"
                  stroke={highlight.color}
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              )}
            </g>
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

      {activeHighlight && !drawMode && (
        <HighlightPopup
          anchorRect={anchorRect}
          note={activeHighlight.note ?? ''}
          onNoteChange={(text) => onUpdateHighlightNote(activeHighlight.id, text)}
          onDelete={handleDeleteActive}
          onMouseEnter={handlePopupEnter}
          onMouseLeave={handlePopupLeave}
        />
      )}
    </>
  );
}
