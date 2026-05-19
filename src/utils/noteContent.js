function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isHtmlNote(note) {
  if (!note || typeof note !== 'string') {
    return false;
  }

  return /<[a-z][\s\S]*>/i.test(note.trim());
}

export function plainTextToHtml(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed
    .split(/\n\n+/)
    .map((paragraph) => {
      const inner = paragraph
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br>');
      return `<p>${inner}</p>`;
    })
    .join('');
}

/** Load plain or HTML notes into the editor. */
export function normalizeNoteForEditor(note) {
  if (!note || !note.trim()) {
    return '';
  }

  if (isHtmlNote(note)) {
    return note;
  }

  return plainTextToHtml(note);
}

/** Persist editor output; treat empty paragraphs as no note. */
export function noteHtmlForStorage(html) {
  const trimmed = html?.trim() ?? '';
  if (!trimmed || trimmed === '<p></p>' || trimmed === '<p><br></p>') {
    return '';
  }

  return trimmed;
}

/** Plain text for search excerpts and other non-HTML consumers. */
export function stripHtmlToPlainText(html) {
  if (!html) {
    return '';
  }

  if (!isHtmlNote(html)) {
    return html;
  }

  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}
