const fs = require('fs/promises');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const A4_LANDSCAPE = [841.89, 595.28];
const MARGIN = 40;
const DEFAULT_IMAGE_RATIO = 0.6;
const MIN_IMAGE_RATIO = 0.5;
const LINE_HEIGHT = 14;
const HEADING_GAP = 18;
const SECTION_GAP = 12;
const HIGHLIGHT_DOT_SIZE = 8;
const HIGHLIGHT_TEXT_INDENT = 14;

function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function hexToRgb(hex) {
  const normalized = String(hex ?? '#cccccc').replace('#', '');
  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value)) {
    return rgb(0.8, 0.8, 0.8);
  }

  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function wrapNoteLines(text, maxChars = 90) {
  if (!text) {
    return [];
  }

  const lines = [];
  const paragraphs = text.split(/\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line) {
      lines.push(line);
    }
  }

  return lines;
}

function getHighlightsWithNotes(slideData) {
  return (slideData?.highlights ?? []).filter((highlight) =>
    String(highlight.note ?? '').trim(),
  );
}

function buildPageContent(noteText, slideData) {
  const noteLines = wrapNoteLines(noteText);
  const highlightsWithNotes = getHighlightsWithNotes(slideData).map((highlight) => ({
    color: highlight.color,
    lines: wrapNoteLines(highlight.note, 82),
  }));

  return { noteLines, highlightsWithNotes };
}

function estimateContentHeight({ noteLines, highlightsWithNotes }) {
  let height = HEADING_GAP;

  if (noteLines.length === 0) {
    height += LINE_HEIGHT;
  } else {
    height += noteLines.length * LINE_HEIGHT;
  }

  if (highlightsWithNotes.length > 0) {
    height += SECTION_GAP + HEADING_GAP;

    for (const highlight of highlightsWithNotes) {
      height += Math.max(highlight.lines.length, 1) * LINE_HEIGHT + 4;
    }
  }

  return height;
}

function truncateContent(content, maxHeight) {
  const next = {
    noteLines: [...content.noteLines],
    highlightsWithNotes: content.highlightsWithNotes.map((item) => ({
      color: item.color,
      lines: [...item.lines],
    })),
  };

  while (estimateContentHeight(next) > maxHeight) {
    const lastHighlight = next.highlightsWithNotes[next.highlightsWithNotes.length - 1];

    if (lastHighlight?.lines.length) {
      lastHighlight.lines.pop();
      if (lastHighlight.lines.length === 0) {
        next.highlightsWithNotes.pop();
      }
      continue;
    }

    if (next.highlightsWithNotes.length) {
      next.highlightsWithNotes.pop();
      continue;
    }

    if (next.noteLines.length) {
      next.noteLines.pop();
      continue;
    }

    break;
  }

  return next;
}

function resolveLayout(pageHeight, content) {
  const footerReserve = 36;
  const textBaseY = MARGIN + 40;
  const minImageHeight = pageHeight * MIN_IMAGE_RATIO;
  const defaultMaxImageHeight = pageHeight * DEFAULT_IMAGE_RATIO;

  const maxTextHeightForMinImage =
    pageHeight - MARGIN - minImageHeight - SECTION_GAP - textBaseY - footerReserve;

  let fittedContent = content;
  if (estimateContentHeight(content) > maxTextHeightForMinImage) {
    fittedContent = truncateContent(content, maxTextHeightForMinImage);
  }

  const contentHeight = estimateContentHeight(fittedContent);
  const maxImageHeightForText =
    pageHeight - MARGIN - textBaseY - contentHeight - SECTION_GAP - 8;
  const imageHeight = Math.max(
    minImageHeight,
    Math.min(defaultMaxImageHeight, maxImageHeightForText),
  );

  return {
    content: fittedContent,
    imageHeight,
    contentHeight,
  };
}

function drawTextBlock(page, { content, totalSlides, index }) {
  page.drawText(`Slide ${index + 1} / ${totalSlides} · SlideNotes`, {
    x: MARGIN,
    y: 24,
    size: 9,
    color: rgb(0.45, 0.45, 0.45),
  });

  let textY = MARGIN + 40;

  for (let highlightIndex = content.highlightsWithNotes.length - 1; highlightIndex >= 0; highlightIndex -= 1) {
    const highlight = content.highlightsWithNotes[highlightIndex];
    const lines = highlight.lines.length > 0 ? highlight.lines : [''];

    for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
      page.drawRectangle({
        x: MARGIN,
        y: textY - 2,
        width: HIGHLIGHT_DOT_SIZE,
        height: HIGHLIGHT_DOT_SIZE,
        color: hexToRgb(highlight.color),
      });

      page.drawText(lines[lineIndex], {
        x: MARGIN + HIGHLIGHT_TEXT_INDENT,
        y: textY,
        size: 10,
        color: rgb(0.15, 0.15, 0.15),
      });

      textY += LINE_HEIGHT;
    }

    textY += 4;
  }

  if (content.highlightsWithNotes.length > 0) {
    page.drawText('Highlights:', {
      x: MARGIN,
      y: textY,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
    });
    textY += HEADING_GAP + SECTION_GAP;
  }

  if (content.noteLines.length === 0) {
    page.drawText('—', {
      x: MARGIN,
      y: textY,
      size: 10,
      color: rgb(0.55, 0.55, 0.55),
    });
    textY += LINE_HEIGHT;
  } else {
    for (let lineIndex = content.noteLines.length - 1; lineIndex >= 0; lineIndex -= 1) {
      page.drawText(content.noteLines[lineIndex], {
        x: MARGIN,
        y: textY,
        size: 10,
        color: rgb(0.15, 0.15, 0.15),
      });
      textY += LINE_HEIGHT;
    }
  }

  page.drawText('Notes:', {
    x: MARGIN,
    y: textY,
    size: 12,
    color: rgb(0.2, 0.2, 0.2),
  });
}

async function exportNotesPdf({ filePath, slideImages, notes }) {
  const pdfDoc = await PDFDocument.create();
  const totalSlides = slideImages.length;

  for (let index = 0; index < totalSlides; index += 1) {
    const page = pdfDoc.addPage(A4_LANDSCAPE);
    const { width, height } = page.getSize();
    const slideData = notes[String(index)] ?? {};
    const pageContent = buildPageContent(slideData.note ?? '', slideData);
    const layout = resolveLayout(height, pageContent);

    const imageBytes = dataUrlToBuffer(slideImages[index]);
    const image = await pdfDoc.embedPng(imageBytes);
    const imageScale = Math.min((width - MARGIN * 2) / image.width, layout.imageHeight / image.height);
    const imageWidth = image.width * imageScale;
    const imageHeight = image.height * imageScale;
    const imageX = (width - imageWidth) / 2;
    const imageY = height - MARGIN - imageHeight;

    page.drawImage(image, {
      x: imageX,
      y: imageY,
      width: imageWidth,
      height: imageHeight,
    });

    drawTextBlock(page, {
      content: layout.content,
      totalSlides,
      index,
    });
  }

  const parsed = path.parse(filePath);
  const exportPath = path.join(parsed.dir, `${parsed.name}-notes.pdf`);
  const pdfBytes = await pdfDoc.save();

  await fs.writeFile(exportPath, pdfBytes);

  return exportPath;
}

module.exports = { exportNotesPdf };
