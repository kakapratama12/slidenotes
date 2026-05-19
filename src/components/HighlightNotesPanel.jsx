import { HIGHLIGHT_COLORS } from '../constants/highlightColors.js';

function getColorLabel(hex) {
  return HIGHLIGHT_COLORS.find((color) => color.hex === hex)?.label ?? 'Highlight';
}

export default function HighlightNotesPanel({ width, highlights, currentIndex }) {
  return (
    <aside
      className="flex h-full min-h-0 shrink-0 flex-col border-l border-slate-200 bg-slate-50 p-4"
      style={{ width: `${width}%` }}
    >
      <h2 className="text-sm font-semibold text-slate-800">
        Highlight Notes — Slide {currentIndex + 1}
      </h2>
      {highlights.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No highlights on this slide</p>
      ) : (
        <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {highlights.map((highlight, index) => (
            <li
              key={highlight.id}
              className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"
            >
              <span
                className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-300"
                style={{ backgroundColor: highlight.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">
                  {getColorLabel(highlight.color)}
                </p>
                <p className="mt-1 text-slate-600">
                  {highlight.note?.trim() ? highlight.note : '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
