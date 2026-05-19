import { useState } from 'react';

function isPdfPath(filePath) {
  return typeof filePath === 'string' && filePath.toLowerCase().endsWith('.pdf');
}

export default function DropZone({ onFileSelected }) {
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectFile = (filePath) => {
    if (!isPdfPath(filePath)) {
      setError('Please use a PDF file.');
      return;
    }

    setError(null);
    onFileSelected(filePath);
  };

  const handleClick = async () => {
    const filePath = await window.electronAPI.openFileDialog();
    if (filePath) {
      selectFile(filePath);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (!file) {
      return;
    }

    selectFile(file.path);
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`flex max-w-lg flex-col items-center rounded-xl border-2 border-dashed px-12 py-16 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <p className="text-lg font-medium text-slate-800">
          Drop a PDF file here, or click to browse
        </p>
        <p className="mt-2 text-sm text-slate-500">PDF files only</p>
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
