import { useEffect, useRef, useState } from 'react';
import { useSearch } from '../hooks/useSearch.js';

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}

function Excerpt({ parts }) {
  return (
    <p className="text-sm text-slate-600">
      {parts.map((part, index) =>
        part.bold ? (
          <strong key={index} className="font-semibold text-slate-900">
            {part.text}
          </strong>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </p>
  );
}

export default function SearchPanel({ isOpen, notes, onClose, onSelectResult }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const results = useSearch(notes, query);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const trimmedQuery = query.trim();

  const handleSelect = (result) => {
    onSelectResult(result.slideIndex);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close search"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes..."
            className="min-w-0 flex-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!trimmedQuery && (
            <p className="px-2 py-4 text-center text-sm text-slate-500">
              Type to search your notes
            </p>
          )}

          {trimmedQuery && results.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-slate-500">
              {`No results for '${trimmedQuery}'`}
            </p>
          )}

          {trimmedQuery && results.length > 0 && (
            <ul className="space-y-1">
              {results.map((result, index) => (
                <li key={`${result.slideIndex}-${result.type}-${result.highlightId ?? index}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        Slide {result.slideIndex + 1}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {result.type === 'slide' ? 'Slide Note' : 'Highlight'}
                      </span>
                    </div>
                    <Excerpt parts={result.excerpt.parts} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
