import { useEffect, useRef, useState } from 'react';
import DropZone from './components/DropZone.jsx';
import NotesPanel from './components/NotesPanel.jsx';
import SlideViewer from './components/SlideViewer.jsx';
import ThumbnailBar from './components/ThumbnailBar.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import ExportModal from './components/ExportModal.jsx';
import Toast from './components/Toast.jsx';
import { CURSOR_TOOL } from './constants/highlightTools.js';
import { useNotes } from './hooks/useNotes.js';
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
  } = useNotes(filePath);

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
      }

      if (event.key === 'Escape') {
        setActiveTool(CURSOR_TOOL);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTryAnotherFile = () => {
    setFilePath(null);
    setExportStatus('idle');
    setExportMessage('');
    setToastMessage('');
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
    return <DropZone onFileSelected={setFilePath} />;
  }

  return (
    <>
      <div className="flex h-screen min-h-0 overflow-hidden bg-slate-100 font-sans">
        <ThumbnailBar
          pageCount={pageCount}
          currentIndex={currentIndex}
          loading={loading}
          onSelect={goTo}
          renderThumbnail={renderThumbnail}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
          <SlideViewer
            ref={slideViewerRef}
            pageCount={pageCount}
            currentIndex={currentIndex}
            loading={loading}
            error={error}
            zoom={zoom}
            onPrev={goPrev}
            onNext={goNext}
            onTryAnotherFile={handleTryAnotherFile}
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
          />
        </main>

        <NotesPanel
          currentIndex={currentIndex}
          notes={notes}
          saveStatus={saveStatus}
          onNoteChange={updateNote}
          onExport={handleOpenExportModal}
          exportStatus={exportStatus}
          exportMessage={exportMessage}
        />
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
