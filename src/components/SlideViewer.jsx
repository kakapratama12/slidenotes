import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CURSOR_TOOL, toolToDrawColor } from '../constants/highlightTools.js';
import { clampPanOffset } from '../utils/slidePan.js';
import HighlightOverlay from './HighlightOverlay.jsx';
import HighlightToolbar from './HighlightToolbar.jsx';

const SlideViewer = forwardRef(function SlideViewer(
  {
    pageCount,
    currentIndex,
    loading,
    error,
    zoom,
    onPrev,
    onNext,
    onTryAnotherFile,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onZoomChange,
    renderPage,
    captureSlide,
    highlights,
    activeTool,
    onActiveToolChange,
    onGoHome,
    viewLayout,
    onToggleLayout,
    selectedHighlightId,
    flashHighlightId,
    onSelectHighlight,
    onAddHighlight,
    onUpdateHighlightNote,
    onUpdateHighlight,
    onDeleteHighlight,
  },
  ref,
) {
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panSessionRef = useRef(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const zoomWheelDeltaRef = useRef(0);
  const zoomWheelRafRef = useRef(null);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const isFirstSlide = currentIndex <= 0;
  const isLastSlide = pageCount === 0 || currentIndex >= pageCount - 1;
  const zoomPercent = Math.round(zoom * 100);
  const drawColor = toolToDrawColor(activeTool);
  const isCursorTool = activeTool === CURSOR_TOOL;
  const canPan = zoom > 1 && isCursorTool;

  const getPanBounds = useCallback(() => {
    const container = scrollRef.current;
    if (!container || canvasSize.width === 0 || canvasSize.height === 0) {
      return null;
    }

    const styles = getComputedStyle(container);
    const paddingX =
      Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
    const paddingY =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);

    return {
      containerWidth: container.clientWidth - paddingX,
      containerHeight: container.clientHeight - paddingY,
      contentWidth: canvasSize.width * zoom,
      contentHeight: canvasSize.height * zoom,
    };
  }, [canvasSize.height, canvasSize.width, zoom]);

  const applyPan = useCallback(
    (nextX, nextY) => {
      const bounds = getPanBounds();
      if (!bounds) {
        setPan({ x: 0, y: 0 });
        return;
      }

      setPan(
        clampPanOffset(
          nextX,
          nextY,
          bounds.containerWidth,
          bounds.containerHeight,
          bounds.contentWidth,
          bounds.contentHeight,
        ),
      );
    },
    [getPanBounds],
  );

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
    panSessionRef.current = null;
  }, [currentIndex]);

  useEffect(() => {
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
      setIsPanning(false);
      panSessionRef.current = null;
      return;
    }

    applyPan(panRef.current.x, panRef.current.y);
  }, [zoom, applyPan, canvasSize.width, canvasSize.height]);

  useEffect(() => {
    if (!isPanning) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const session = panSessionRef.current;
      if (!session) {
        return;
      }

      const deltaX = event.clientX - session.startClientX;
      const deltaY = event.clientY - session.startClientY;
      applyPan(session.startPanX + deltaX, session.startPanY + deltaY);
    };

    const endPan = () => {
      panSessionRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endPan);
    window.addEventListener('pointercancel', endPan);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', endPan);
      window.removeEventListener('pointercancel', endPan);
    };
  }, [isPanning, applyPan]);

  const handlePanPointerDown = useCallback(
    (event) => {
      if (!canPan) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      panSessionRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      setIsPanning(true);
    },
    [canPan, pan.x, pan.y],
  );

  const handleScrollPointerDown = useCallback(
    (event) => {
      if (!canPan || event.target !== scrollRef.current) {
        return;
      }

      handlePanPointerDown(event);
    },
    [canPan, handlePanPointerDown],
  );

  const focusHighlight = useCallback(
    (highlightId) => {
      const highlight = highlights.find((item) => item.id === highlightId);
      if (!highlight) {
        return;
      }

      onSelectHighlight(highlightId);

      if (zoom <= 1 || canvasSize.width === 0 || canvasSize.height === 0) {
        return;
      }

      const bounds = getPanBounds();
      if (!bounds) {
        return;
      }

      const offsetX = (highlight.x + highlight.width / 2 - 0.5) * canvasSize.width * zoom;
      const offsetY = (highlight.y + highlight.height / 2 - 0.5) * canvasSize.height * zoom;
      applyPan(-offsetX, -offsetY);
    },
    [
      highlights,
      zoom,
      canvasSize.width,
      canvasSize.height,
      getPanBounds,
      applyPan,
      onSelectHighlight,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      captureSlide: (index, slideHighlights) => captureSlide(index, slideHighlights),
      focusHighlight,
    }),
    [captureSlide, focusHighlight],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey) {
        if (event.key === '=' || event.key === '+') {
          event.preventDefault();
          onZoomIn();
          return;
        }

        if (event.key === '-') {
          event.preventDefault();
          onZoomOut();
          return;
        }

        if (event.key === '0') {
          event.preventDefault();
          onZoomReset();
          return;
        }
      }

      if (event.key === 'ArrowLeft' && !isFirstSlide) {
        event.preventDefault();
        onPrev();
      }

      if (event.key === 'ArrowRight' && !isLastSlide) {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onPrev,
    onNext,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    isFirstSlide,
    isLastSlide,
  ]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setResizeTick((tick) => tick + 1);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [loading, pageCount, error]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return undefined;
    }

    const flushZoomWheel = () => {
      zoomWheelRafRef.current = null;
      const accumulatedDelta = zoomWheelDeltaRef.current;
      zoomWheelDeltaRef.current = 0;

      if (accumulatedDelta === 0) {
        return;
      }

      const factor = Math.exp(-accumulatedDelta * 0.01);
      onZoomChange(zoomRef.current * factor);
    };

    const scheduleZoomWheel = (deltaY) => {
      zoomWheelDeltaRef.current += deltaY;
      if (zoomWheelRafRef.current === null) {
        zoomWheelRafRef.current = requestAnimationFrame(flushZoomWheel);
      }
    };

    const handleWheel = (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
        scheduleZoomWheel(event.deltaY);
        return;
      }

      if (zoomRef.current > 1) {
        event.preventDefault();
        const { x, y } = panRef.current;
        applyPan(x - event.deltaX, y - event.deltaY);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (zoomWheelRafRef.current !== null) {
        cancelAnimationFrame(zoomWheelRafRef.current);
        zoomWheelRafRef.current = null;
      }
      zoomWheelDeltaRef.current = 0;
    };
  }, [applyPan, onZoomChange]);

  useEffect(() => {
    if (loading || pageCount === 0 || error) {
      return undefined;
    }

    let cancelled = false;

    async function drawSlide() {
      setRendering(true);

      try {
        await renderPage(currentIndex, canvasRef.current);
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    drawSlide();

    return () => {
      cancelled = true;
    };
  }, [currentIndex, pageCount, loading, error, renderPage, resizeTick]);

  useEffect(() => {
    if (rendering) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    setCanvasSize({ width: canvas.width, height: canvas.height });
  }, [rendering, currentIndex, resizeTick]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={onTryAnotherFile}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Try another file
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        Loading PDF…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        data-slide-scroll
        className={`relative flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg bg-slate-50 p-4 ${
          canPan && !isPanning ? 'cursor-grab' : ''
        } ${canPan && isPanning ? 'cursor-grabbing' : ''}`}
        onPointerDown={handleScrollPointerDown}
      >
        <div className="flex h-full w-full items-center justify-center">
          <div
            className={`relative inline-block origin-center shadow-sm ${
              drawColor ? 'cursor-crosshair' : ''
            }`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
          <canvas ref={canvasRef} className="block" />
          <HighlightOverlay
            width={canvasSize.width}
            height={canvasSize.height}
            highlights={highlights}
            drawColor={drawColor}
            enablePan={canPan}
            isPanning={isPanning}
            onPanPointerDown={handlePanPointerDown}
            selectedId={selectedHighlightId}
            flashHighlightId={flashHighlightId}
            onSelect={onSelectHighlight}
            onCreate={onAddHighlight}
            onUpdateHighlightNote={onUpdateHighlightNote}
            onUpdateHighlight={onUpdateHighlight}
            onDeleteHighlight={onDeleteHighlight}
          />
          </div>
        </div>
        {rendering && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-slate-500">
            Rendering…
          </div>
        )}
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-center gap-2">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className="min-w-[4rem] rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          aria-label="Reset zoom"
        >
          {zoomPercent}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={zoom >= 3}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      <HighlightToolbar
        activeTool={activeTool}
        onToolChange={onActiveToolChange}
        onGoHome={onGoHome}
        viewLayout={viewLayout}
        onToggleLayout={onToggleLayout}
      />

      <div className="mt-4 flex shrink-0 items-center justify-center gap-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirstSlide}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>

        <span className="min-w-[4rem] text-center text-sm text-slate-700">
          {pageCount > 0 ? `${currentIndex + 1} / ${pageCount}` : '0 / 0'}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={isLastSlide}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
});

export default SlideViewer;
