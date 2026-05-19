import { useCallback, useState } from 'react';

export const RECENT_FILES_KEY = 'slidenotes-recent-files';
const MAX_RECENT_FILES = 10;

function getFileName(filePath) {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

function readStoredRecentFiles() {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.path === 'string' &&
        typeof item.name === 'string' &&
        typeof item.lastOpened === 'string',
    );
  } catch {
    return [];
  }
}

function writeStoredRecentFiles(files) {
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
  } catch {
    // ignore quota / private mode errors
  }
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState(() => readStoredRecentFiles());

  const addRecentFile = useCallback((filePath, pageCount) => {
    const entry = {
      path: filePath,
      name: getFileName(filePath),
      lastOpened: new Date().toISOString(),
      pageCount: Number.isFinite(pageCount) ? pageCount : 0,
    };

    setRecentFiles((prev) => {
      const withoutCurrent = prev.filter((item) => item.path !== filePath);
      const next = [entry, ...withoutCurrent]
        .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
        .slice(0, MAX_RECENT_FILES);

      writeStoredRecentFiles(next);
      return next;
    });
  }, []);

  const removeRecentFile = useCallback((filePath) => {
    setRecentFiles((prev) => {
      const next = prev.filter((item) => item.path !== filePath);
      writeStoredRecentFiles(next);
      return next;
    });
  }, []);

  return {
    recentFiles,
    addRecentFile,
    removeRecentFile,
  };
}
