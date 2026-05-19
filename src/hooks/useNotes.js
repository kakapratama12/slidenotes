import { useCallback, useEffect, useMemo, useState } from 'react';

function debounce(fn, delayMs) {
  let timeoutId;

  const debounced = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };

  debounced.cancel = () => clearTimeout(timeoutId);

  return debounced;
}

export function useNotes(filePath) {
  const [notes, setNotes] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved');

  const persistNotes = useCallback(async (notesToSave) => {
    if (!filePath) {
      return;
    }

    setSaveStatus('saving');

    try {
      const result = await window.electronAPI.saveNotes(filePath, notesToSave);
      setSaveStatus(result?.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
  }, [filePath]);

  const saveDebounced = useMemo(
    () => debounce((notesToSave) => persistNotes(notesToSave), 800),
    [persistNotes],
  );

  useEffect(() => () => saveDebounced.cancel(), [saveDebounced]);

  const updateNote = useCallback(
    (slideIndex, text) => {
      const key = String(slideIndex);

      setNotes((prev) => {
        const next = {
          ...prev,
          [key]: {
            note: text,
            highlights: prev[key]?.highlights ?? [],
          },
        };

        saveDebounced(next);
        return next;
      });
    },
    [saveDebounced],
  );

  return {
    notes,
    updateNote,
    saveStatus,
  };
}
