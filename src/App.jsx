import { useCallback, useEffect, useRef, useState } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import HighlightNotesPanel from './components/HighlightNotesPanel.jsx';
import NotesPanel from './components/NotesPanel.jsx';
import PanelDivider from './components/PanelDivider.jsx';
import SlideViewer from './components/SlideViewer.jsx';
import ThumbnailBar from './components/ThumbnailBar.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import ExportModal from './components/ExportModal.jsx';
import Toast from './components/Toast.jsx';
import { CURSOR_TOOL } from './constants/highlightTools.js';
import {
  getStoredLayout,
  LAYOUT_DEFAULT,
  LAYOUT_ZOOM,
  storeLayout,
  toggleLayout,
} from './constants/appLayout.js';
import {
  clampNotesPanelWidth,
  getStoredNotesPanelWidth,
  storeNotesPanelWidth,
} from './constants/panelLayout.js';
import {
  clampZoomHighlightWidth,
  getStoredZoomHighlightWidth,
  storeZoomHighlightWidth,
} from './constants/zoomLayout.js';
import { useNotes } from './hooks/useNotes.js';
import { useRecentFiles } from './hooks/useRecentFiles.js';
import { useSlides } from './hooks/useSlides.js';

function getFileName(filePath) {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

function App() {
  const [filePath, setFilePath] = useState(null);
  const [exportStatus, setExportStatus] = useState('idle');
  const [exportMessage, setExportMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(CURSOR_TOOL);
  const [selectedHighlightId, setSelectedHighlightId] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const slideViewerRef = useRef(null);
  const layoutRef = useRef(null);
  const notesPanelWidthRef = useRef(getStoredNotesPanelWidth());
  const [notesPanelWidth, setNotesPanelWidth] = useState(() => getStoredNotesPanelWidth());
  const [viewLayout, setViewLayout] = useState(() => getStoredLayout());
  const zoomBottomRef = useRef(null);
  const zoomHighlightWidthRef = useRef(getStoredZoomHighlightWidth());
  const [zoomHighlightWidth, setZoomHighlightWidth] = useState(() =>
    getStoredZoomHighlightWidth(),
  );
  const { recentFiles, addRecentFile, removeRecentFile } = useRecentFiles();

  const {
    pageCount,
    currentIndex,
    loading,
    error,
    goNext,
    goPrev,
    goTo,
    zoom,
    zoomIn,
    zoomOut,
    zoomReset,
    setZoomClamped,
    renderPage,
    renderThumbnail,
    captureSlide,
  } = useSlides(filePath);

  const {
    notes,
    updateNote,
    addHighlight,
    deleteHighlight,
    updateHighlightNote,
    updateHighlight,
    saveStatus,
    hydrateNotes,
    flushSave,
  } = useNotes(filePath);

  const resetViewerState = useCallback(() => {
    setExportStatus('idle');
    setExportMessage('');
    setSearchOpen(false);
    setActiveTool(CURSOR_TOOL);
    setSelectedHighlightId(null);
    setExportModalOpen(false);
  }, []);

  const handleGoHome = useCallback(async () => {
    await flushSave();
    setFilePath(null);
    resetViewerState();
  }, [flushSave, resetViewerState]);

  const handleOpenFile = useCallback((path) => {
    resetViewerState();
    setToastMessage('');
    setFilePath(path);
  }, [resetViewerState]);

  const handleOpenRecentFile = useCallback(
    async (path) => {
      const exists = await window.electronAPI.fileExists(path);
      if (!exists) {
        setToastMessage(
          `Could not find "${getFileName(path)}". It may have been moved or deleted.`,
        );
        removeRecentFile(path);
        return;
      }

      handleOpenFile(path);
    },
    [handleOpenFile, removeRecentFile],
  );

  useEffect(() => {
    if (!filePath) {
      window.electronAPI.setWindowTitle('SlideNotes');
      return;
    }

    window.electronAPI.setWindowTitle(`SlideNotes — ${getFileName(filePath)}`);
    setActiveTool(CURSOR_TOOL);
  }, [filePath]);

  useEffect(() => {
    if (!filePath) {
      return undefined;
    }

    let cancelled = false;

    async function loadPersistedNotes() {
      const data = await window.electronAPI.loadNotes(filePath);

      if (cancelled) {
        return;
      }

      if (data?.slides && typeof data.slides === 'object') {
        const slides = Object.fromEntries(
          Object.entries(data.slides).map(([key, slide]) => [
            key,
            {
              note: slide?.note ?? '',
              highlights: (slide?.highlights ?? []).map((highlight) => ({
                ...highlight,
                note: highlight?.note ?? '',
              })),
            },
          ]),
        );
        hydrateNotes(slides);
      } else {
        hydrateNotes({});
      }
    }

    loadPersistedNotes();

    return () => {
      cancelled = true;
    };
  }, [filePath, hydrateNotes]);

  useEffect(() => {
    if (filePath && pageCount > 0 && !loading && !error) {
      addRecentFile(filePath, pageCount);
    }
  }, [filePath, pageCount, loading, error, addRecentFile]);

  useEffect(() => {
    if (exportStatus === 'error' && exportMessage) {
      setToastMessage(exportMessage);
    }
  }, [exportStatus, exportMessage]);

  useEffect(() => {
    setSelectedHighlightId(null);
  }, [currentIndex]);

  const slideHighlights = notes[String(currentIndex)]?.highlights ?? [];

  const handleAddHighlight = (highlight) => {
    addHighlight(currentIndex, highlight);
  };

  const handleUpdateHighlightNote = (highlightId, note) => {
    updateHighlightNote(currentIndex, highlightId, note);
  };

  const handleDeleteHighlight = (highlightId) => {
    deleteHighlight(currentIndex, highlightId);
    if (selectedHighlightId === highlightId) {
      setSelectedHighlightId(null);
    }
  };

  const handleUpdateHighlight = (highlightId, geometry) => {
    updateHighlight(currentIndex, highlightId, geometry);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setSearchOpen((open) => !open);
        return;
      }

      if (event.key === 'Escape') {
        setActiveTool(CURSOR_TOOL);
        return;
      }

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedHighlightId &&
        activeTool === CURSOR_TOOL &&
        filePath !== null
      ) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'TEXTAREA' || activeTag === 'INPUT') {
          return;
        }

        event.preventDefault();
        deleteHighlight(currentIndex, selectedHighlightId);
        setSelectedHighlightId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHighlightId, activeTool, filePath, currentIndex, deleteHighlight]);

  const handlePanelDividerDrag = (clientX) => {
    const layout = layoutRef.current;
    if (!layout) {
      return;
    }

    const rect = layout.getBoundingClientRect();
    const containerWidth = rect.width;
    if (containerWidth <= 0) {
      return;
    }

    const dividerX = clientX - rect.left;
    const nextWidth = clampNotesPanelWidth(
      ((containerWidth - dividerX) / containerWidth) * 100,
    );
    notesPanelWidthRef.current = nextWidth;
    setNotesPanelWidth(nextWidth);
  };

  const handlePanelDividerDragEnd = () => {
    storeNotesPanelWidth(notesPanelWidthRef.current);
  };

  const handleToggleViewLayout = useCallback(() => {
    setViewLayout((current) => {
      const next = toggleLayout(current);
      storeLayout(next);
      return next;
    });
  }, []);

  const handleZoomBottomDividerDrag = (clientX) => {
    const container = zoomBottomRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    if (containerWidth <= 0) {
      return;
    }

    const dividerX = clientX - rect.left;
    const nextWidth = clampZoomHighlightWidth(
      ((containerWidth - dividerX) / containerWidth) * 100,
    );
    zoomHighlightWidthRef.current = nextWidth;
    setZoomHighlightWidth(nextWidth);
  };

  const handleZoomBottomDividerDragEnd = () => {
    storeZoomHighlightWidth(zoomHighlightWidthRef.current);
  };

  const handleOpenExportModal = () => {
    if (pageCount === 0) {
      return;
    }

    setExportModalOpen(true);
  };

  const handleExportPdf = async (layout) => {
    if (!filePath || pageCount === 0) {
      return;
    }

    const needsSlideImages = layout !== 'notes-only';

    if (needsSlideImages && !slideViewerRef.current) {
      return;
    }

    setExportModalOpen(false);
    setExportStatus('exporting');
    setExportMessage('Exporting...');
    setToastMessage('');

    try {
      const slideImages = [];

      if (needsSlideImages) {
        for (let index = 0; index < pageCount; index += 1) {
          const highlights = notes[String(index)]?.highlights ?? [];
          const image = await slideViewerRef.current.captureSlide(index, highlights);
          slideImages.push(image);
        }
      }

      const result = await window.electronAPI.exportPdf(
        filePath,
        slideImages,
        notes,
        layout,
      );

      if (result?.ok) {
        setExportStatus('success');
        setExportMessage(`Saved to ${result.exportPath}`);
      } else {
        setExportStatus('error');
        setExportMessage(result?.error ?? 'Export failed. Please try again.');
      }
    } catch {
      setExportStatus('error');
      setExportMessage('Export failed. Please try again.');
    }
  };

  if (filePath === null) {
    return (
      <>
        <HomeScreen
          recentFiles={recentFiles}
          onFileSelected={handleOpenFile}
          onRecentFileSelect={handleOpenRecentFile}
        />
        <Toast
          message={toastMessage}
          variant="error"
          onDismiss={() => setToastMessage('')}
        />
      </>
    );
  }

  const slideViewer = (
    <SlideViewer
      ref={slideViewerRef}
      pageCount={pageCount}
      currentIndex={currentIndex}
      loading={loading}
      error={error}
      zoom={zoom}
      onPrev={goPrev}
      onNext={goNext}
      onTryAnotherFile={handleGoHome}
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
      onZoomReset={zoomReset}
      onZoomChange={setZoomClamped}
      renderPage={renderPage}
      captureSlide={captureSlide}
      highlights={slideHighlights}
      activeTool={activeTool}
      onActiveToolChange={setActiveTool}
      selectedHighlightId={selectedHighlightId}
      onSelectHighlight={setSelectedHighlightId}
      onAddHighlight={handleAddHighlight}
      onUpdateHighlightNote={handleUpdateHighlightNote}
      onUpdateHighlight={handleUpdateHighlight}
      onDeleteHighlight={handleDeleteHighlight}
      onGoHome={handleGoHome}
      viewLayout={viewLayout}
      onToggleLayout={handleToggleViewLayout}
    />
  );

  const notesPanelProps = {
    currentIndex,
    notes,
    saveStatus,
    onNoteChange: updateNote,
    onExport: handleOpenExportModal,
    exportStatus,
    exportMessage,
  };

  return (
    <>
      <div ref={layoutRef} className="flex h-screen min-h-0 overflow-hidden bg-slate-100 font-sans">
        {viewLayout === LAYOUT_DEFAULT ? (
          <>
            <ThumbnailBar
              pageCount={pageCount}
              currentIndex={currentIndex}
              loading={loading}
              onSelect={goTo}
              renderThumbnail={renderThumbnail}
            />

            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
              {slideViewer}
            </main>

            <PanelDivider onDrag={handlePanelDividerDrag} onDragEnd={handlePanelDividerDragEnd} />

            <NotesPanel width={notesPanelWidth} variant="sidebar" {...notesPanelProps} />
          </>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <main className="flex h-[60%] min-h-0 flex-col overflow-hidden p-4">{slideViewer}</main>

            <div
              ref={zoomBottomRef}
              className="flex h-[40%] min-h-0 overflow-hidden border-t border-slate-200"
            >
              <NotesPanel variant="bottom" {...notesPanelProps} />

              <PanelDivider
                onDrag={handleZoomBottomDividerDrag}
                onDragEnd={handleZoomBottomDividerDragEnd}
              />

              <HighlightNotesPanel
                width={zoomHighlightWidth}
                highlights={slideHighlights}
                currentIndex={currentIndex}
              />
            </div>
          </div>
        )}
      </div>

      <SearchPanel
        isOpen={searchOpen}
        notes={notes}
        onClose={() => setSearchOpen(false)}
        onSelectResult={goTo}
      />

      <ExportModal
        isOpen={exportModalOpen}
        isExporting={exportStatus === 'exporting'}
        onCancel={() => setExportModalOpen(false)}
        onExport={handleExportPdf}
      />

      <Toast
        message={toastMessage}
        variant="error"
        onDismiss={() => setToastMessage('')}
      />
    </>
  );
}

export default App;
