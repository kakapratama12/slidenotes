import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  getHighlightNumber,
  sortHighlightsByPosition,
} from '../utils/highlightNumbering.js';

const SAVE_DEBOUNCE_MS = 800;

function debounce(fn, delayMs) {
  let timeoutId;

  const debounced = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };

  debounced.flush = (...args) => {
    clearTimeout(timeoutId);
    fn(...args);
  };

  debounced.cancel = () => clearTimeout(timeoutId);

  return debounced;
}

const HighlightNotesList = forwardRef(function HighlightNotesList(
  {
    highlights,
    selectedHighlightId,
    listFocusHighlightId,
    onSelectHighlight,
    onSelectHighlightQuiet,
    onUpdateHighlightNote,
  },
  ref,
) {
  const itemRefs = useRef({});
  const textareaRefs = useRef({});
  const skipBlurCommitRef = useRef(false);
  const [editingId, setEditingId] = useState(null);
  const [draftNotes, setDraftNotes] = useState({});

  const sortedHighlights = sortHighlightsByPosition(highlights);

  const saveNoteDebounced = useMemo(
    () => debounce((highlightId, note) => onUpdateHighlightNote(highlightId, note), SAVE_DEBOUNCE_MS),
    [onUpdateHighlightNote],
  );

  useEffect(() => () => saveNoteDebounced.cancel(), [saveNoteDebounced]);

  const highlightIdsKey = highlights.map((item) => item.id).join(',');

  useEffect(() => {
    setEditingId(null);
    setDraftNotes({});
    saveNoteDebounced.cancel();
  }, [highlightIdsKey, saveNoteDebounced]);

  useImperativeHandle(ref, () => ({
    scrollToHighlight(highlightId) {
      const element = itemRefs.current[highlightId];
      element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
  }));

  useEffect(() => {
    if (!listFocusHighlightId) {
      return;
    }

    itemRefs.current[listFocusHighlightId]?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [listFocusHighlightId]);

  const startEditing = (highlight) => {
    skipBlurCommitRef.current = true;
    (onSelectHighlightQuiet ?? onSelectHighlight)(highlight.id);
    setEditingId(highlight.id);
    setDraftNotes((prev) => ({
      ...prev,
      [highlight.id]: highlight.note ?? '',
    }));
  };

  const commitNote = (highlightId, note) => {
    saveNoteDebounced.cancel();
    onUpdateHighlightNote(highlightId, note);
    setEditingId((current) => (current === highlightId ? null : current));
    setDraftNotes((prev) => {
      const next = { ...prev };
      delete next[highlightId];
      return next;
    });
  };

  const handleNoteBlur = (highlightId) => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }

    const note = draftNotes[highlightId] ?? '';
    commitNote(highlightId, note);
  };

  useEffect(() => {
    if (!editingId) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const textarea = textareaRefs.current[editingId];
      textarea?.focus();
      skipBlurCommitRef.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  if (sortedHighlights.length === 0) {
    return <p className="mt-6 text-sm text-slate-500">No highlights on this slide</p>;
  }

  return (
    <ul className="mt-4 min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto">
      {sortedHighlights.map((highlight) => {
        const number = getHighlightNumber(highlights, highlight.id ?? highlight);
        const isSelected = highlight.id === selectedHighlightId;
        const isEditing = editingId === highlight.id;
        const displayNote = highlight.note?.trim() ?? '';

        return (
          <li key={highlight.id} className="min-w-0 overflow-hidden">
            <div
              ref={(element) => {
                if (element) {
                  itemRefs.current[highlight.id] = element;
                } else {
                  delete itemRefs.current[highlight.id];
                }
              }}
              className={`flex w-full min-w-0 gap-3 overflow-hidden rounded-lg border p-3 text-left text-sm transition-colors ${
                isSelected
                  ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${isEditing ? '' : 'cursor-pointer'}`}
              onClick={
                isEditing
                  ? undefined
                  : () => onSelectHighlight(highlight.id)
              }
              onMouseDown={(event) => {
                if (isEditing) {
                  event.stopPropagation();
                }
              }}
            >
              <span
                className="mt-1 h-4 w-4 shrink-0 rounded-full border border-slate-300"
                style={{ backgroundColor: highlight.color }}
                aria-hidden
              />
              <span className="mt-0.5 shrink-0 font-semibold text-slate-700">[{number}]</span>

              {isEditing ? (
                <textarea
                  ref={(element) => {
                    if (element) {
                      textareaRefs.current[highlight.id] = element;
                    } else {
                      delete textareaRefs.current[highlight.id];
                    }
                  }}
                  value={draftNotes[highlight.id] ?? ''}
                  onChange={(event) => {
                    const nextNote = event.target.value;
                    setDraftNotes((prev) => ({ ...prev, [highlight.id]: nextNote }));
                    saveNoteDebounced(highlight.id, nextNote);
                  }}
                  onBlur={() => handleNoteBlur(highlight.id)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder="Add a note..."
                  rows={2}
                  className="min-w-0 flex-1 resize-none overflow-hidden break-words whitespace-normal rounded border border-slate-200 bg-white p-1.5 text-sm text-slate-700 outline-none ring-1 ring-blue-500"
                />
              ) : (
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    startEditing(highlight);
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  className={`min-w-0 flex-1 overflow-hidden break-words whitespace-normal rounded p-1.5 text-left text-sm outline-none hover:bg-slate-50 focus-visible:ring-1 focus-visible:ring-blue-500 ${
                    displayNote ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  <span className="block w-full break-words whitespace-normal">
                    {displayNote || 'Add a note...'}
                  </span>
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
});

export default HighlightNotesList;
