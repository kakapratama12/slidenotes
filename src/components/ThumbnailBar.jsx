import { useEffect, useRef, useState } from 'react';

function ThumbnailItem({
  index,
  isActive,
  scrollRoot,
  onSelect,
  renderThumbnail,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !scrollRoot) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { root: scrollRoot, rootMargin: '120px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    containerRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isActive]);

  useEffect(() => {
    if (!isVisible || hasRendered || !canvasRef.current) {
      return undefined;
    }

    let cancelled = false;

    async function drawThumbnail() {
      await renderThumbnail(index, canvasRef.current);
      if (!cancelled) {
        setHasRendered(true);
      }
    }

    drawThumbnail();

    return () => {
      cancelled = true;
    };
  }, [isVisible, hasRendered, index, renderThumbnail]);

  return (
    <button
      type="button"
      ref={containerRef}
      onClick={() => onSelect(index)}
      className={`flex w-full flex-col items-center rounded-lg border-2 p-2 transition-colors ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-transparent bg-slate-50 hover:border-slate-200'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full rounded bg-white shadow-sm"
        style={{ width: '100%', height: 'auto' }}
      />
      <span className="mt-2 text-xs font-medium text-slate-600">{index + 1}</span>
    </button>
  );
}

export default function ThumbnailBar({
  pageCount,
  currentIndex,
  loading,
  onSelect,
  renderThumbnail,
}) {
  const scrollRef = useRef(null);
  const [scrollRoot, setScrollRoot] = useState(null);

  useEffect(() => {
    setScrollRoot(scrollRef.current);
  }, [pageCount, loading]);

  if (loading) {
    return (
      <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Thumbnails
        </p>
        <p className="mt-4 text-sm text-slate-400">Loading…</p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        Thumbnails
      </p>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-2">
          {Array.from({ length: pageCount }, (_, index) => (
            <ThumbnailItem
              key={index}
              index={index}
              isActive={index === currentIndex}
              scrollRoot={scrollRoot}
              onSelect={onSelect}
              renderThumbnail={renderThumbnail}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
