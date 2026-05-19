import HighlightNotesList from './HighlightNotesList.jsx';

export default function HighlightNotesPanel({
  width,
  highlights,
  currentIndex,
  selectedHighlightId,
  listFocusHighlightId,
  onSelectHighlight,
  onUpdateHighlightNote,
  listRef,
}) {
  return (
    <aside
      className="flex h-full min-h-0 shrink-0 flex-col border-l border-slate-200 bg-slate-50 p-4"
      style={{ width: `${width}%` }}
    >
      <h2 className="text-sm font-semibold text-slate-800">
        Highlight Notes — Slide {currentIndex + 1}
      </h2>
      <HighlightNotesList
        ref={listRef}
        highlights={highlights}
        selectedHighlightId={selectedHighlightId}
        listFocusHighlightId={listFocusHighlightId}
        onSelectHighlight={onSelectHighlight}
        onUpdateHighlightNote={onUpdateHighlightNote}
      />
    </aside>
  );
}
