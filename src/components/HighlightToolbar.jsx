import { HIGHLIGHT_COLORS } from '../constants/highlightColors.js';
import { CURSOR_TOOL } from '../constants/highlightTools.js';

function CursorIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3l14 9-6 1 4 8-2 1-4-8-6-1z"
      />
    </svg>
  );
}

export default function HighlightToolbar({ activeTool, onToolChange, onGoHome }) {
  const isCursorActive = activeTool === CURSOR_TOOL;

  return (
    <div className="mt-3 flex shrink-0 items-center justify-center gap-2">
      <button
        type="button"
        onClick={onGoHome}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        aria-label="Back to home"
      >
        ← Home
      </button>

      <div className="mx-1 h-6 w-px bg-slate-300" aria-hidden />

      <button
        type="button"
        title="Cursor"
        aria-label="Cursor tool"
        aria-pressed={isCursorActive}
        onClick={() => onToolChange(CURSOR_TOOL)}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
          isCursorActive
            ? 'border-slate-800 bg-slate-100 text-slate-900 shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <CursorIcon />
      </button>

      <div className="mx-1 h-6 w-px bg-slate-300" aria-hidden />

      {HIGHLIGHT_COLORS.map((color) => {
        const isActive = activeTool === color.id;

        return (
          <button
            key={color.id}
            type="button"
            title={color.label}
            aria-label={`${color.label} highlight`}
            aria-pressed={isActive}
            onClick={() => onToolChange(color.id)}
            className={`h-8 w-8 rounded-full transition-shadow ${
              isActive ? 'ring-2 ring-slate-800 ring-offset-2 ring-offset-slate-100' : ''
            }`}
            style={{ backgroundColor: color.hex }}
          />
        );
      })}
    </div>
  );
}
