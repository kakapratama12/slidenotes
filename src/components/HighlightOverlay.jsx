import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getHighlightStrokeColor,
  HIGHLIGHT_FILL_OPACITY,
} from '../constants/highlightColors.js';
import {
  clampHighlight,
  getHandleCenter,
  HANDLE_CURSORS,
  HANDLE_SIZE,
  resizeHighlightByDelta,
  RESIZE_HANDLES,
} from '../utils/highlightGeometry.js';
import { getHighlightNumber } from '../utils/highlightNumbering.js';
import HighlightNumberBadge from './HighlightNumberBadge.jsx';
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

/** Map pointer to SVG user space (matches width/height props, including CSS scale/zoom). */
function getLocalPoint(event, svgElement) {
  const rect = svgElement.getBoundingClientRect();
  const svgWidth = Number(svgElement.getAttribute('width')) || rect.width;
  const svgHeight = Number(svgElement.getAttribute('height')) || rect.height;

  if (rect.width === 0 || rect.height === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: ((event.clientX - rect.left) / rect.width) * svgWidth,
    y: ((event.clientY - rect.top) / rect.height) * svgHeight,
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
  enablePan,
  isPanning,
  onPanPointerDown,
  selectedId,
  flashHighlightId,
  onSelect,
  onCreate,
  onUpdateHighlightNote,
  onUpdateHighlight,
  onDeleteHighlight,
}) {
  const svgRef = useRef(null);
  const rectRefs = useRef({});
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const [hoveredHighlightId, setHoveredHighlightId] = useState(null);
  const [dragState, setDragState] = useState(null);
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
      if (drawMode || dragState) {
        return;
      }

      setHoveredHighlightId(highlightId);
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
    [drawMode, dragState, clearHideTimer, clearShowTimer, openPopupForHighlight],
  );

  const handleHighlightLeave = useCallback(() => {
    if (dragState) {
      return;
    }

    setHoveredHighlightId(null);
    clearShowTimer();
    scheduleHidePopup();
  }, [dragState, clearShowTimer, scheduleHidePopup]);

  const handlePopupEnter = useCallback(() => {
    clearHideTimer();
  }, [clearHideTimer]);

  const handlePopupLeave = useCallback(() => {
    scheduleHidePopup();
  }, [scheduleHidePopup]);

  const dismissPopup = useCallback(() => {
    clearShowTimer();
    clearHideTimer();
    setActiveHighlightId(null);
    setAnchorRect(null);
  }, [clearShowTimer, clearHideTimer]);

  useEffect(() => {
    clearShowTimer();
    clearHideTimer();
    setActiveHighlightId(null);
    setAnchorRect(null);
    setHoveredHighlightId(null);
    setDragState(null);
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

  const startDrag = useCallback(
    (event, highlight, handle) => {
      if (drawMode || !svgRef.current) {
        return;
      }

      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      const point = getLocalPoint(event, svgRef.current);
      const original = {
        x: highlight.x,
        y: highlight.y,
        width: highlight.width,
        height: highlight.height,
      };

      dismissPopup();
      onSelect(highlight.id);
      setHoveredHighlightId(highlight.id);

      setDragState({
        id: highlight.id,
        type: handle ? 'resize' : 'move',
        handle,
        startPoint: point,
        pointerOffset: {
          x: point.x / width - original.x,
          y: point.y / height - original.y,
        },
        original,
        preview: { ...original },
      });
    },
    [drawMode, dismissPopup, onSelect],
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (dragState) {
        return;
      }

      if (!drawMode && event.target === svgRef.current) {
        onSelect(null);
        dismissPopup();
      }

      if (enablePan && event.target === svgRef.current) {
        onPanPointerDown?.(event);
        return;
      }

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
    [dragState, drawMode, dismissPopup, enablePan, onPanPointerDown, onSelect, width, height],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (dragState && svgRef.current) {
        const point = getLocalPoint(event, svgRef.current);
        const deltaX = (point.x - dragState.startPoint.x) / width;
        const deltaY = (point.y - dragState.startPoint.y) / height;

        if (dragState.type === 'move') {
          const pointerX = point.x / width - dragState.pointerOffset.x;
          const pointerY = point.y / height - dragState.pointerOffset.y;
          const preview = clampHighlight({
            x: pointerX,
            y: pointerY,
            width: dragState.original.width,
            height: dragState.original.height,
          });
          setDragState((prev) => (prev ? { ...prev, preview } : prev));
        } else {
          const preview = resizeHighlightByDelta(
            dragState.original,
            dragState.handle,
            deltaX,
            deltaY,
          );
          setDragState((prev) => (prev ? { ...prev, preview } : prev));
        }

        return;
      }

      if (!draft) {
        return;
      }

      const point = getLocalPoint(event, svgRef.current);
      setDraft((prev) =>
        prev ? { ...prev, currentX: point.x, currentY: point.y } : prev,
      );
    },
    [dragState, draft, width, height],
  );

  const handlePointerUp = useCallback(
    (event) => {
      if (dragState) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        onUpdateHighlight(dragState.id, dragState.preview);
        setDragState(null);
        return;
      }

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
    [dragState, draft, drawColor, width, height, onCreate, onUpdateHighlight],
  );

  const handlePointerCancel = useCallback(() => {
    setDraft(null);
    setDragState(null);
  }, []);

  const activeHighlight = highlights.find((item) => item.id === activeHighlightId);

  const handleDeleteActive = () => {
    if (!activeHighlightId) {
      return;
    }

    dismissPopup();
    onDeleteHighlight(activeHighlightId);
  };

  if (width === 0 || height === 0) {
    return null;
  }

  const draftRect = draft
    ? normalizeRect(draft.startX, draft.startY, draft.currentX, draft.currentY, width, height)
    : null;

  const getDisplayGeometry = (highlight) => {
    if (dragState?.id === highlight.id && dragState.preview) {
      return dragState.preview;
    }

    return {
      x: highlight.x,
      y: highlight.y,
      width: highlight.width,
      height: highlight.height,
    };
  };

  return (
    <>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute left-0 top-0 touch-none"
        style={{
          cursor: enablePan ? (isPanning ? 'grabbing' : 'grab') : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {highlights.map((highlight) => {
          const geometry = getDisplayGeometry(highlight);
          const isSelected = highlight.id === selectedId;
          const isFlashing = highlight.id === flashHighlightId;
          const pixelX = geometry.x * width;
          const pixelY = geometry.y * height;
          const pixelW = geometry.width * width;
          const pixelH = geometry.height * height;
          const showNoteDot = hasNoteText(highlight.note);
          const showHandles =
            !drawMode && (hoveredHighlightId === highlight.id || dragState?.id === highlight.id);

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
                stroke={getHighlightStrokeColor(highlight.color, isSelected || isFlashing)}
                strokeWidth={isSelected || isFlashing ? 3 : 1}
                className={isFlashing ? 'highlight-flash' : undefined}
                style={{
                  pointerEvents: drawMode ? 'none' : 'auto',
                  cursor: drawMode ? 'default' : 'move',
                }}
                onMouseEnter={() => handleHighlightEnter(highlight.id)}
                onMouseLeave={handleHighlightLeave}
                onPointerDown={(event) => startDrag(event, highlight, null)}
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
              {showHandles &&
                RESIZE_HANDLES.map((handle) => {
                  const center = getHandleCenter(handle, pixelX, pixelY, pixelW, pixelH);
                  const half = HANDLE_SIZE / 2;

                  return (
                    <rect
                      key={`${highlight.id}-${handle}`}
                      x={center.x - half}
                      y={center.y - half}
                      width={HANDLE_SIZE}
                      height={HANDLE_SIZE}
                      fill="#ffffff"
                      stroke={highlight.color}
                      strokeWidth={1.5}
                      style={{ cursor: HANDLE_CURSORS[handle] }}
                      onMouseEnter={() => {
                        if (!drawMode) {
                          setHoveredHighlightId(highlight.id);
                        }
                      }}
                      onPointerDown={(event) => startDrag(event, highlight, handle)}
                    />
                  );
                })}
            </g>
          );
        })}

        <g className="pointer-events-none" aria-hidden={highlights.length === 0}>
          {highlights.map((highlight) => {
            const geometry = getDisplayGeometry(highlight);
            const highlightNumber = getHighlightNumber(highlights, highlight);

            if (!highlightNumber) {
              return null;
            }

            return (
              <HighlightNumberBadge
                key={`badge-${highlight.id}`}
                number={highlightNumber}
                x={geometry.x * width + 4}
                y={geometry.y * height + 4}
                color={highlight.color}
              />
            );
          })}
        </g>

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

      {activeHighlight && !drawMode && !dragState && (
        <HighlightPopup
          anchorRect={anchorRect}
          highlightNumber={getHighlightNumber(highlights, activeHighlight)}
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
