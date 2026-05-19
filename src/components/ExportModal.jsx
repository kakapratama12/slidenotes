import { useEffect, useState } from 'react';
import {
  DEFAULT_EXPORT_LAYOUT,
  EXPORT_LAYOUTS,
  getStoredExportLayout,
  storeExportLayout,
} from '../constants/exportLayouts.js';

function LayoutPreview({ layoutId }) {
  if (layoutId === '1-per-page') {
    return (
      <svg viewBox="0 0 80 56" className="h-14 w-20 text-slate-400" aria-hidden>
        <rect x="4" y="4" width="72" height="30" rx="2" fill="currentColor" opacity="0.25" />
        <rect x="4" y="38" width="72" height="14" rx="2" fill="currentColor" opacity="0.15" />
      </svg>
    );
  }

  if (layoutId === '2-per-page') {
    return (
      <svg viewBox="0 0 80 56" className="h-14 w-20 text-slate-400" aria-hidden>
        <rect x="4" y="30" width="72" height="12" rx="2" fill="currentColor" opacity="0.25" />
        <rect x="4" y="44" width="72" height="8" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="4" y="8" width="72" height="12" rx="2" fill="currentColor" opacity="0.25" />
        <rect x="4" y="22" width="72" height="8" rx="2" fill="currentColor" opacity="0.15" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 80 56" className="h-14 w-20 text-slate-400" aria-hidden>
      <rect x="8" y="8" width="64" height="6" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="8" y="18" width="64" height="4" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="8" y="26" width="64" height="4" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="8" y="38" width="64" height="6" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="8" y="48" width="64" height="4" rx="2" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

export default function ExportModal({ isOpen, isExporting, onCancel, onExport }) {
  const [layout, setLayout] = useState(DEFAULT_EXPORT_LAYOUT);

  useEffect(() => {
    if (isOpen) {
      setLayout(getStoredExportLayout());
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleExport = () => {
    storeExportLayout(layout);
    onExport(layout);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close export options"
        onClick={onCancel}
        disabled={isExporting}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
      >
        <h2 id="export-modal-title" className="text-lg font-semibold text-slate-900">
          Export PDF
        </h2>
        <p className="mt-1 text-sm text-slate-500">Choose a layout for your exported notes.</p>

        <div className="mt-4 space-y-2">
          {EXPORT_LAYOUTS.map((option) => {
            const isSelected = layout === option.id;

            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-4 rounded-lg border p-3 transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="export-layout"
                  value={option.id}
                  checked={isSelected}
                  onChange={() => setLayout(option.id)}
                  className="sr-only"
                />
                <LayoutPreview layoutId={option.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{option.label}</p>
                  <p className="text-xs text-slate-500">{option.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExporting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
