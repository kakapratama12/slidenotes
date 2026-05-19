import { useState } from 'react';
import DropZone from './DropZone.jsx';

function formatRecentDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatSlideCount(pageCount) {
  const count = Number(pageCount) || 0;
  return count === 1 ? '1 slide' : `${count} slides`;
}

export default function HomeScreen({ recentFiles, onFileSelected, onRecentFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file?.path) {
      onFileSelected(file.path);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center bg-slate-50 px-6 py-12 font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h1 className="mb-10 text-2xl font-semibold tracking-tight text-slate-900">SlideNotes</h1>

      <DropZone embedded isDragging={isDragging} onFileSelected={onFileSelected} />

      {recentFiles.length > 0 && (
        <section className="mt-12 w-full max-w-lg">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
            Recent Files
          </h2>
          <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {recentFiles.map((file, index) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => onRecentFileSelect(file.path)}
                  className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    index > 0 ? 'border-t border-slate-100' : ''
                  }`}
                >
                  <span className="text-sm font-medium text-slate-900">
                    <span aria-hidden className="mr-2">
                      📄
                    </span>
                    {file.name}
                  </span>
                  <span className="pl-6 text-xs text-slate-500">
                    {formatRecentDate(file.lastOpened)}
                    {file.pageCount > 0 ? ` · ${formatSlideCount(file.pageCount)}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
