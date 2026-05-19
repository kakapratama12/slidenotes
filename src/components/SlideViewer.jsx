import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const SlideViewer = forwardRef(function SlideViewer(
  {
    pageCount,
    currentIndex,
    loading,
    error,
    onPrev,
    onNext,
    onTryAnotherFile,
    renderPage,
    captureSlide,
  },
  ref,
) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);

  const isFirstSlide = currentIndex <= 0;
  const isLastSlide = pageCount === 0 || currentIndex >= pageCount - 1;

  useImperativeHandle(
    ref,
    () => ({
      captureSlide: (index) => captureSlide(index),
    }),
    [captureSlide],
  );

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
    const handleResize = () => setResizeTick((tick) => tick + 1);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg bg-slate-50">
        <canvas ref={canvasRef} className="max-h-full max-w-full shadow-sm" />
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-slate-500">
            Rendering…
          </div>
        )}
      </div>

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
