import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  getHighlightNumber,
  sortHighlightsByPosition,
} from '../utils/highlightNumbering.js';

const HighlightNotesList = forwardRef(function HighlightNotesList(
  {
    highlights,
    selectedHighlightId,
    listFocusHighlightId,
    onSelectHighlight,
    onUpdateHighlightNote,
  },
  ref,
) {
  const itemRefs = useRef({});
  const sortedHighlights = sortHighlightsByPosition(highlights);

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

  if (sortedHighlights.length === 0) {
    return <p className="mt-6 text-sm text-slate-500">No highlights on this slide</p>;
  }

  return (
    <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
      {sortedHighlights.map((highlight) => {
        const number = getHighlightNumber(highlights, highlight.id);
        const isSelected = highlight.id === selectedHighlightId;

        return (
          <li key={highlight.id}>
            <button
              type="button"
              ref={(element) => {
                if (element) {
                  itemRefs.current[highlight.id] = element;
                } else {
                  delete itemRefs.current[highlight.id];
                }
              }}
              onClick={() => onSelectHighlight(highlight.id)}
              className={`flex w-full gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                isSelected
                  ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span
                className="mt-1 h-4 w-4 shrink-0 rounded-full border border-slate-300"
                style={{ backgroundColor: highlight.color }}
                aria-hidden
              />
              <span className="shrink-0 font-semibold text-slate-700">[{number}]</span>
              <textarea
                value={highlight.note ?? ''}
                onChange={(event) => onUpdateHighlightNote(highlight.id, event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onFocus={() => onSelectHighlight(highlight.id)}
                placeholder="Add a note..."
                rows={2}
                className="min-w-0 flex-1 resize-none rounded border border-transparent bg-transparent text-slate-700 outline-none focus:border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
});

export default HighlightNotesList;
