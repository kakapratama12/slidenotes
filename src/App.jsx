import { useEffect, useRef, useState } from 'react';
import DropZone from './components/DropZone.jsx';
import NotesPanel from './components/NotesPanel.jsx';
import SlideViewer from './components/SlideViewer.jsx';
import ThumbnailBar from './components/ThumbnailBar.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import Toast from './components/Toast.jsx';
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
  const [drawColor, setDrawColor] = useState(null);
  const [selectedHighlightId, setSelectedHighlightId] = useState(null);
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
    saveStatus,
    hydrateNotes,
  } = useNotes(filePath);

  useEffect(() => {
    if (!filePath) {
      window.electronAPI.setWindowTitle('SlideNotes');
      return;
    }

    window.electronAPI.setWindowTitle(`SlideNotes — ${getFileName(filePath)}`);
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setSearchOpen((open) => !open);
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

  const handleExportPdf = async () => {
    if (!filePath || pageCount === 0 || !slideViewerRef.current) {
      return;
    }

    setExportStatus('exporting');
    setExportMessage('Exporting...');
    setToastMessage('');

    try {
      const slideImages = [];

      for (let index = 0; index < pageCount; index += 1) {
        const highlights = notes[String(index)]?.highlights ?? [];
        const image = await slideViewerRef.current.captureSlide(index, highlights);
        slideImages.push(image);
      }

      const result = await window.electronAPI.exportPdf(filePath, slideImages, notes);

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
            drawColor={drawColor}
            onDrawColorChange={setDrawColor}
            selectedHighlightId={selectedHighlightId}
            onSelectHighlight={setSelectedHighlightId}
            onAddHighlight={handleAddHighlight}
            onUpdateHighlightNote={handleUpdateHighlightNote}
            onDeleteHighlight={handleDeleteHighlight}
          />
        </main>

        <NotesPanel
          currentIndex={currentIndex}
          notes={notes}
          saveStatus={saveStatus}
          onNoteChange={updateNote}
          onExport={handleExportPdf}
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

      <Toast
        message={toastMessage}
        variant="error"
        onDismiss={() => setToastMessage('')}
      />
    </>
  );
}

export default App;
