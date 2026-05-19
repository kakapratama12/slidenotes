import { useState } from 'react';
import DropZone from './components/DropZone.jsx';
import SlideViewer from './components/SlideViewer.jsx';
import ThumbnailBar from './components/ThumbnailBar.jsx';
import { useSlides } from './hooks/useSlides.js';

function App() {
  const [filePath, setFilePath] = useState(null);
  const [notes, setNotes] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved');

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

      <aside className="w-[35%] max-w-md shrink-0 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Notes Panel
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Slide {currentIndex + 1}
          {pageCount > 0 ? ` / ${pageCount}` : ''} · {saveStatus}
        </p>
      </aside>
    </div>
  );
}

export default App;
