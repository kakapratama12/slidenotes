import { HIGHLIGHT_COLORS } from '../constants/highlightColors.js';

export default function HighlightToolbar({ activeColor, onColorChange }) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-center gap-3">
      {HIGHLIGHT_COLORS.map((color) => {
        const isActive = activeColor === color.hex;

        return (
          <button
            key={color.id}
            type="button"
            title={color.label}
            aria-label={`${color.label} highlight`}
            aria-pressed={isActive}
            onClick={() => onColorChange(isActive ? null : color.hex)}
            className={`h-8 w-8 rounded-full transition-shadow ${
              isActive ? 'ring-2 ring-white shadow-md ring-offset-2 ring-offset-slate-200' : ''
            }`}
            style={{ backgroundColor: color.hex }}
          />
        );
      })}
    </div>
  );
}
