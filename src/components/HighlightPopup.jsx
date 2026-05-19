import { createPortal } from 'react-dom';

const POPUP_WIDTH = 256;
const POPUP_GAP = 8;

function getPopupPosition(anchorRect) {
  const estimatedHeight = 120;
  const spaceAbove = anchorRect.top;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const placeAbove =
    spaceAbove > spaceBelow && spaceAbove >= estimatedHeight + POPUP_GAP;

  const left = Math.min(
    Math.max(POPUP_GAP, anchorRect.left),
    window.innerWidth - POPUP_WIDTH - POPUP_GAP,
  );

  if (placeAbove) {
    return {
      left,
      top: anchorRect.top - POPUP_GAP,
      transform: 'translateY(-100%)',
    };
  }

  return {
    left,
    top: anchorRect.bottom + POPUP_GAP,
    transform: undefined,
  };
}

export default function HighlightPopup({
  anchorRect,
  note,
  onNoteChange,
  onDelete,
  onMouseEnter,
  onMouseLeave,
}) {
  if (!anchorRect) {
    return null;
  }

  const position = getPopupPosition(anchorRect);

  return createPortal(
    <div
      className="fixed z-50 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
      style={{
        left: position.left,
        top: position.top,
        transform: position.transform,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="mb-1 flex justify-end">
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete highlight"
        >
          🗑
        </button>
      </div>
      <textarea
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Add a note..."
        rows={3}
        className="w-full resize-none rounded border border-slate-200 p-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>,
    document.body,
  );
}
