import { useState } from 'react';
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

  const { notes, updateNote, saveStatus } = useNotes(filePath);

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
