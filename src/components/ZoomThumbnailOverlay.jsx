import { useEffect, useRef, useState } from 'react';
import ThumbnailBar from './ThumbnailBar.jsx';

const HOVER_ZONE_HEIGHT_PX = 40;

export default function ZoomThumbnailOverlay({
  pageCount,
  currentIndex,
  loading,
  onSelect,
  renderThumbnail,
  children,
}) {
  const [isHoverZoneActive, setIsHoverZoneActive] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isPanelOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) {
        return;
      }

      if (event.target.closest('[data-zoom-thumbnail-toggle]')) {
        return;
      }

      setIsPanelOpen(false);
    };

    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isPanelOpen]);

  const handleThumbnailSelect = (index) => {
    onSelect(index);
    setIsPanelOpen(false);
  };

  const showToggleButton = isHoverZoneActive && !isPanelOpen && !loading && pageCount > 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className="absolute inset-x-0 top-0 z-30 flex items-start justify-center"
        style={{ height: HOVER_ZONE_HEIGHT_PX }}
        onMouseEnter={() => setIsHoverZoneActive(true)}
        onMouseLeave={() => {
          if (!isPanelOpen) {
            setIsHoverZoneActive(false);
          }
        }}
      >
        {showToggleButton && (
          <button
            type="button"
            data-zoom-thumbnail-toggle
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setIsPanelOpen(true);
              setIsHoverZoneActive(false);
            }}
            className="mt-2 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md backdrop-blur hover:bg-white"
            aria-label="Show slide thumbnails"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Slides
          </button>
        )}
      </div>

      {isPanelOpen && (
        <div
          ref={panelRef}
          className="zoom-thumbnail-panel absolute inset-x-0 top-0 z-50 max-h-[min(320px,45%)] overflow-hidden border-b border-slate-200 bg-white shadow-lg"
        >
          <ThumbnailBar
            variant="overlay"
            pageCount={pageCount}
            currentIndex={currentIndex}
            loading={loading}
            onSelect={handleThumbnailSelect}
            renderThumbnail={renderThumbnail}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
