import { useEffect, useState } from 'react';
import { stripHtmlToPlainText } from '../utils/noteContent.js';

const DEBOUNCE_MS = 300;
const MAX_EXCERPT_LENGTH = 80;

function buildExcerpt(text, query) {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return { parts: [{ text: text.slice(0, MAX_EXCERPT_LENGTH), bold: false }] };
  }

  const contextRadius = Math.floor((MAX_EXCERPT_LENGTH - query.length) / 2);
  let start = Math.max(0, matchIndex - contextRadius);
  let end = Math.min(text.length, matchIndex + query.length + contextRadius);

  if (end - start > MAX_EXCERPT_LENGTH) {
    end = start + MAX_EXCERPT_LENGTH;
  }

  const parts = [];

  if (start > 0) {
    parts.push({ text: '…', bold: false });
  }

  parts.push({ text: text.slice(start, matchIndex), bold: false });
  parts.push({ text: text.slice(matchIndex, matchIndex + query.length), bold: true });
  parts.push({ text: text.slice(matchIndex + query.length, end), bold: false });

  if (end < text.length) {
    parts.push({ text: '…', bold: false });
  }

  return { parts };
}

export function searchNotes(notes, query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const results = [];

  Object.entries(notes).forEach(([slideKey, slide]) => {
    const slideIndex = Number.parseInt(slideKey, 10);

    if (Number.isNaN(slideIndex)) {
      return;
    }

    const slideNote = stripHtmlToPlainText(slide?.note ?? '');

    if (slideNote.toLowerCase().includes(trimmedQuery.toLowerCase())) {
      results.push({
        slideIndex,
        type: 'slide',
        excerpt: buildExcerpt(slideNote, trimmedQuery),
      });
    }

    (slide?.highlights ?? []).forEach((highlight, highlightIndex) => {
      const highlightNote = highlight?.note ?? '';

      if (!highlightNote.toLowerCase().includes(trimmedQuery.toLowerCase())) {
        return;
      }

      results.push({
        slideIndex,
        type: 'highlight',
        excerpt: buildExcerpt(highlightNote, trimmedQuery),
        highlightId: highlight?.id ?? highlightIndex,
      });
    });
  });

  return results.sort((a, b) => {
    if (a.slideIndex !== b.slideIndex) {
      return a.slideIndex - b.slideIndex;
    }

    if (a.type === b.type) {
      return 0;
    }

    return a.type === 'slide' ? -1 : 1;
  });
}

export function useSearch(notes, query) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setResults(searchNotes(notes, query));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [notes, query]);

  return results;
}
