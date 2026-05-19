import { useEffect, useRef, useState } from 'react';
import DropZone from './components/DropZone.jsx';
import NotesPanel from './components/NotesPanel.jsx';
import SlideViewer from './components/SlideViewer.jsx';
import ThumbnailBar from './components/ThumbnailBar.jsx';
import { useNotes } from './hooks/useNotes.js';
import { useSlides } from './hooks/useSlides.js';

function App() {
  const [filePath, setFilePath] = useState(null);
  const [exportStatus, setExportStatus] = useState('idle');
  const [exportMessage, setExportMessage] = useState('');
  const slideViewerRef = useRef(null);

  const {
    pageCount,
    currentIndex,
    loading,
    error,
    goNext,
    goPrev,
    goTo,
    renderPage,
    renderThumbnail,
    captureSlide,
  } = useSlides(filePath);

  const { notes, updateNote, saveStatus, hydrateNotes } = useNotes(filePath);

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
              highlights: slide?.highlights ?? [],
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

  const handleExportPdf = async () => {
    if (!filePath || pageCount === 0 || !slideViewerRef.current) {
      return;
    }

    setExportStatus('exporting');
    setExportMessage('Exporting...');

    try {
      const slideImages = [];

      for (let index = 0; index < pageCount; index += 1) {
        const image = await slideViewerRef.current.captureSlide(index);
        slideImages.push(image);
      }

      const result = await window.electronAPI.exportPdf(filePath, slideImages, notes);

      if (result?.ok) {
        setExportStatus('success');
        setExportMessage(`Saved to ${result.exportPath}`);
      } else {
        setExportStatus('error');
        setExportMessage(result?.error ?? 'Export failed');
      }
    } catch {
      setExportStatus('error');
      setExportMessage('Export failed');
    }
  };

  if (filePath === null) {
    return <DropZone onFileSelected={setFilePath} />;
  }

  return (
    <div className="flex h-screen bg-slate-100">
      <ThumbnailBar
        pageCount={pageCount}
        currentIndex={currentIndex}
        loading={loading}
        onSelect={goTo}
        renderThumbnail={renderThumbnail}
      />

      <main className="flex min-w-0 flex-1 flex-col p-4">
        <SlideViewer
          ref={slideViewerRef}
          pageCount={pageCount}
          currentIndex={currentIndex}
          loading={loading}
          error={error}
          onPrev={goPrev}
          onNext={goNext}
          renderPage={renderPage}
          captureSlide={captureSlide}
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
  );
}

export default App;
