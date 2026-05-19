import { useEffect, useState } from 'react';
import DropZone from './components/DropZone.jsx';
import NotesPanel from './components/NotesPanel.jsx';
import SlideViewer from './components/SlideViewer.jsx';
import ThumbnailBar from './components/ThumbnailBar.jsx';
import { useNotes } from './hooks/useNotes.js';
import { useSlides } from './hooks/useSlides.js';

function App() {
  const [filePath, setFilePath] = useState(null);

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
          pageCount={pageCount}
          currentIndex={currentIndex}
          loading={loading}
          error={error}
          onPrev={goPrev}
          onNext={goNext}
          renderPage={renderPage}
        />
      </main>

      <NotesPanel
        currentIndex={currentIndex}
        notes={notes}
        saveStatus={saveStatus}
        onNoteChange={updateNote}
      />
    </div>
  );
}

export default App;
