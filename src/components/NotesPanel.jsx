function SaveStatus({ status }) {
  if (status === 'saving') {
    return <p className="text-sm text-slate-500">Saving...</p>;
  }

  if (status === 'error') {
    return <p className="text-sm text-red-600">⚠ Save failed</p>;
  }

  return <p className="text-sm text-green-600">✓ Saved</p>;
}

export default function NotesPanel({ currentIndex, notes, saveStatus, onNoteChange }) {
  const slideKey = String(currentIndex);
  const noteValue = notes[slideKey]?.note ?? '';

  return (
    <aside className="flex w-[35%] max-w-md shrink-0 flex-col border-l border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-800">
        Notes — Slide {currentIndex + 1}
      </h2>

      <textarea
        className="mt-3 min-h-0 flex-1 resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
