import { useEffect, useRef, useState } from 'react';

export default function SlideViewer({
  pageCount,
  currentIndex,
  loading,
  error,
  onPrev,
  onNext,
  renderPage,
}) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);

  const isFirstSlide = currentIndex <= 0;
  const isLastSlide = pageCount === 0 || currentIndex >= pageCount - 1;

  useEffect(() => {
    const handleKeyDown = (event) => {
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
  }, [onPrev, onNext, isFirstSlide, isLastSlide]);

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
  }, [currentIndex, pageCount, loading, error, renderPage]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-red-600">
        {error}
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
    <div className="flex flex-1 flex-col">
      <div className="relative flex flex-1 items-center justify-center overflow-auto bg-slate-50">
        <canvas ref={canvasRef} className="max-h-full max-w-full shadow-sm" />
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-slate-500">
            Rendering…
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirstSlide}
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
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
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
