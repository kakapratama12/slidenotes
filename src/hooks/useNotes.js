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

    const saveOnce = () => window.electronAPI.saveNotes(filePath, notesToSave);

    try {
      let result = await saveOnce();

      if (!result?.ok) {
        result = await saveOnce();
      }

      setSaveStatus(result?.ok ? 'saved' : 'error');
    } catch {
      try {
        const result = await saveOnce();
        setSaveStatus(result?.ok ? 'saved' : 'error');
      } catch {
        setSaveStatus('error');
      }
    }
  }, [filePath]);

  const saveDebounced = useMemo(
    () => debounce((notesToSave) => persistNotes(notesToSave), 800),
    [persistNotes],
  );

  useEffect(() => () => saveDebounced.cancel(), [saveDebounced]);

  useEffect(() => {
    saveDebounced.cancel();
    setNotes({});
    setSaveStatus('saved');
  }, [filePath, saveDebounced]);

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

  const hydrateNotes = useCallback((slides) => {
    setNotes(slides ?? {});
    setSaveStatus('saved');
  }, []);

  const addHighlight = useCallback(
    (slideIndex, highlight) => {
      const key = String(slideIndex);

      setNotes((prev) => {
        const slide = prev[key] ?? { note: '', highlights: [] };
        const next = {
          ...prev,
          [key]: {
            note: slide.note ?? '',
            highlights: [...(slide.highlights ?? []), highlight],
          },
        };

        saveDebounced(next);
        return next;
      });
    },
    [saveDebounced],
  );

  const deleteHighlight = useCallback(
    (slideIndex, highlightId) => {
      const key = String(slideIndex);

      setNotes((prev) => {
        const slide = prev[key];
        if (!slide) {
          return prev;
        }

        const next = {
          ...prev,
          [key]: {
            note: slide.note ?? '',
            highlights: (slide.highlights ?? []).filter((item) => item.id !== highlightId),
          },
        };

        saveDebounced(next);
        return next;
      });
    },
    [saveDebounced],
  );

  const updateHighlightNote = useCallback(
    (slideIndex, highlightId, note) => {
      const key = String(slideIndex);

      setNotes((prev) => {
        const slide = prev[key];
        if (!slide) {
          return prev;
        }

        const next = {
          ...prev,
          [key]: {
            note: slide.note ?? '',
            highlights: (slide.highlights ?? []).map((item) =>
              item.id === highlightId ? { ...item, note } : item,
            ),
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
    addHighlight,
    deleteHighlight,
    updateHighlightNote,
    saveStatus,
    hydrateNotes,
  };
}
