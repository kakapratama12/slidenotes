import { useEffect, useRef, useState } from 'react';

function ThumbnailItem({
  index,
  isActive,
  scrollRoot,
  layout,
  onSelect,
  renderThumbnail,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const isHorizontal = layout === 'horizontal';

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
      {
        root: scrollRoot,
        rootMargin: isHorizontal ? '0px 80px' : '120px 0px',
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollRoot, isHorizontal]);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    containerRef.current.scrollIntoView({
      block: 'nearest',
      inline: isHorizontal ? 'nearest' : 'nearest',
      behavior: 'smooth',
    });
  }, [isActive, isHorizontal]);

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
      className={
        isHorizontal
          ? `flex w-[88px] shrink-0 flex-col items-center rounded-md border-2 p-1.5 transition-colors ${
              isActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-transparent bg-slate-50 hover:border-slate-200'
            }`
          : `flex w-full flex-col items-center rounded-lg border-2 p-2 transition-colors ${
              isActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-transparent bg-slate-50 hover:border-slate-200'
            }`
      }
    >
      <canvas
        ref={canvasRef}
        className={`rounded bg-white shadow-sm ${
          isHorizontal ? 'h-auto max-h-[68px] w-[76px]' : 'max-w-full'
        }`}
        style={isHorizontal ? undefined : { width: '100%', height: 'auto' }}
      />
      <span
        className={`font-medium text-slate-600 ${isHorizontal ? 'mt-1 text-[10px]' : 'mt-2 text-xs'}`}
      >
        {index + 1}
      </span>
    </button>
  );
}

export default function ThumbnailBar({
  variant = 'sidebar',
  pageCount,
  currentIndex,
  loading,
  onSelect,
  renderThumbnail,
}) {
  const scrollRef = useRef(null);
  const [scrollRoot, setScrollRoot] = useState(null);
  const isOverlay = variant === 'overlay';

  useEffect(() => {
    setScrollRoot(scrollRef.current);
  }, [pageCount, loading, variant]);

  if (loading) {
    return (
      <aside
        className={
          isOverlay
            ? 'flex h-full min-h-0 w-full flex-col justify-center bg-white px-3'
            : 'flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white p-3'
        }
      >
        {!isOverlay && (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Thumbnails
          </p>
        )}
        <p className={`text-sm text-slate-400 ${isOverlay ? '' : 'mt-4'}`}>Loading…</p>
      </aside>
    );
  }

  if (isOverlay) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col bg-white">
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 items-center overflow-x-auto overflow-y-hidden px-2 py-2"
        >
          <div className="flex flex-row gap-2">
            {Array.from({ length: pageCount }, (_, index) => (
              <ThumbnailItem
                key={index}
                index={index}
                isActive={index === currentIndex}
                scrollRoot={scrollRoot}
                layout="horizontal"
                onSelect={onSelect}
                renderThumbnail={renderThumbnail}
              />
            ))}
          </div>
        </div>
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
              layout="vertical"
              onSelect={onSelect}
              renderThumbnail={renderThumbnail}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
