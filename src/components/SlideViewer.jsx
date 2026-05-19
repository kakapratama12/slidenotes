import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
    drawColor,
    onDrawColorChange,
    selectedHighlightId,
    onSelectHighlight,
    onAddHighlight,
    onUpdateHighlightNote,
    onDeleteHighlight,
  },
  ref,
) {
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const isFirstSlide = currentIndex <= 0;
  const isLastSlide = pageCount === 0 || currentIndex >= pageCount - 1;
  const zoomPercent = Math.round(zoom * 100);

  useImperativeHandle(
    ref,
    () => ({
      captureSlide: (index, highlights) => captureSlide(index, highlights),
    }),
    [captureSlide],
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
    const handleResize = () => setResizeTick((tick) => tick + 1);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return undefined;
    }

    const handleWheel = (event) => {
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      onZoomChange(zoom + delta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoomChange]);

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
        className="relative min-h-0 flex-1 overflow-auto rounded-lg bg-slate-50 p-4"
      >
        <div
          className="relative inline-block origin-top-left shadow-sm"
          style={{ transform: `scale(${zoom})` }}
        >
          <canvas ref={canvasRef} className="block" />
          <HighlightOverlay
            width={canvasSize.width}
            height={canvasSize.height}
            highlights={highlights}
            drawColor={drawColor}
            selectedId={selectedHighlightId}
            onSelect={onSelectHighlight}
            onCreate={onAddHighlight}
            onUpdateHighlightNote={onUpdateHighlightNote}
            onDeleteHighlight={onDeleteHighlight}
          />
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

      <HighlightToolbar activeColor={drawColor} onColorChange={onDrawColorChange} />

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
