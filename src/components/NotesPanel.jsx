function SaveStatus({ status }) {
  if (status === 'saving') {
    return <p className="text-sm text-slate-500">Saving...</p>;
  }

  if (status === 'error') {
    return <p className="text-sm text-red-600">⚠ Save failed</p>;
  }

  return <p className="text-sm text-green-600">✓ Saved</p>;
}

function ExportStatus({ status, message }) {
  if (!status || status === 'idle') {
    return null;
  }

  if (status === 'exporting') {
    return <p className="text-sm text-slate-500">{message}</p>;
  }

  if (status === 'error') {
    return <p className="text-sm text-red-600">{message}</p>;
  }

  return <p className="text-sm text-green-600">{message}</p>;
}

export default function NotesPanel({
  width,
  variant = 'sidebar',
  currentIndex,
  notes,
  saveStatus,
  onNoteChange,
  onExport,
  exportStatus,
  exportMessage,
}) {
  const slideKey = String(currentIndex);
  const noteValue = notes[slideKey]?.note ?? '';
  const isExporting = exportStatus === 'exporting';
  const isBottom = variant === 'bottom';

  return (
    <aside
      className={`flex h-full min-h-0 flex-col bg-white p-4 ${
        isBottom ? 'min-w-0 flex-1' : 'shrink-0'
      }`}
      style={isBottom ? undefined : { width: `${width}%` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">
          Notes — Slide {currentIndex + 1}
        </h2>
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      <ExportStatus status={exportStatus} message={exportMessage} />

      <textarea
        className="mt-3 min-h-0 flex-1 resize-none overflow-y-auto rounded-lg border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        placeholder="Type your notes here..."
        value={noteValue}
        onChange={(event) => onNoteChange(currentIndex, event.target.value)}
      />

      <div className="mt-3">
        <SaveStatus status={saveStatus} />
      </div>
    </aside>
  );
}
