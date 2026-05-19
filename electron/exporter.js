const fs = require('fs/promises');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const A4_LANDSCAPE = [841.89, 595.28];
const A4_PORTRAIT = [595.28, 841.89];
const MARGIN = 40;
const DEFAULT_IMAGE_RATIO = 0.6;
const MIN_IMAGE_RATIO = 0.5;
const LINE_HEIGHT = 14;
const HEADING_GAP = 18;
const SECTION_GAP = 12;
const HIGHLIGHT_DOT_SIZE = 8;
const HIGHLIGHT_TEXT_INDENT = 14;
const VALID_LAYOUTS = new Set(['1-per-page', '2-per-page', 'notes-only']);

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

function getSlideCount(slideImages, notes) {
  const imageCount = slideImages.length;
  const noteKeys = Object.keys(notes ?? {});
  const noteCount = noteKeys.reduce(
    (max, key) => Math.max(max, Number.parseInt(key, 10) + 1),
    0,
  );

  return Math.max(imageCount, noteCount);
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

function estimateContentHeight(content) {
  let height = HEADING_GAP;

  if (content.noteLines.length === 0) {
    height += LINE_HEIGHT;
  } else {
    height += content.noteLines.length * LINE_HEIGHT;
  }

  if (content.highlightsWithNotes.length > 0) {
    height += SECTION_GAP + HEADING_GAP;

    for (const highlight of content.highlightsWithNotes) {
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

function resolveLayout(pageHeight, content, options = {}) {
  const {
    minImageRatio = MIN_IMAGE_RATIO,
    maxImageRatio = DEFAULT_IMAGE_RATIO,
    footerReserve = 36,
    textBaseY = MARGIN + 40,
  } = options;

  const minImageHeight = pageHeight * minImageRatio;
  const defaultMaxImageHeight = pageHeight * maxImageRatio;

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

function drawTextBlock(page, { content, totalSlides, index, textOptions = {} }) {
  const {
    textBaseY = MARGIN + 40,
    footerY = 24,
    showPageFooter = true,
    yOffset = 0,
  } = textOptions;

  const baseY = textBaseY + yOffset;
  const slideFooterY = footerY + yOffset;

  if (showPageFooter) {
    page.drawText(`Slide ${index + 1} / ${totalSlides} · SlideNotes`, {
      x: MARGIN,
      y: slideFooterY,
      size: 9,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  let textY = baseY;

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

async function drawSlideOnPage(page, pdfDoc, {
  index,
  totalSlides,
  slideImages,
  notes,
  pageWidth,
  pageHeight,
  layoutOptions,
  textOptions,
  yOffset = 0,
}) {
  const slideData = notes[String(index)] ?? {};
  const pageContent = buildPageContent(slideData.note ?? '', slideData);
  const layout = resolveLayout(pageHeight, pageContent, layoutOptions);

  const imageBytes = dataUrlToBuffer(slideImages[index]);
  const image = await pdfDoc.embedPng(imageBytes);
  const imageScale = Math.min(
    (pageWidth - MARGIN * 2) / image.width,
    layout.imageHeight / image.height,
  );
  const imageWidth = image.width * imageScale;
  const imageHeight = image.height * imageScale;
  const imageX = (pageWidth - imageWidth) / 2;
  const regionTop = yOffset + pageHeight;
  const imageY = regionTop - MARGIN - imageHeight;

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
    textOptions: {
      ...textOptions,
      yOffset,
    },
  });
}

async function exportOnePerPage(pdfDoc, { slideImages, notes, totalSlides }) {
  for (let index = 0; index < totalSlides; index += 1) {
    const page = pdfDoc.addPage(A4_LANDSCAPE);
    const { width, height } = page.getSize();

    await drawSlideOnPage(page, pdfDoc, {
      index,
      totalSlides,
      slideImages,
      notes,
      pageWidth: width,
      pageHeight: height,
      textOptions: { showPageFooter: true },
    });
  }
}

async function exportTwoPerPage(pdfDoc, { slideImages, notes, totalSlides }) {
  const halfLayoutOptions = {
    minImageRatio: 0.32,
    maxImageRatio: 0.46,
    footerReserve: 22,
    textBaseY: MARGIN + 28,
  };

  const halfTextOptions = {
    textBaseY: MARGIN + 28,
    footerY: 12,
    showPageFooter: true,
  };

  for (let index = 0; index < totalSlides; index += 2) {
    const page = pdfDoc.addPage(A4_LANDSCAPE);
    const { width, height } = page.getSize();
    const halfHeight = height / 2;

    await drawSlideOnPage(page, pdfDoc, {
      index,
      totalSlides,
      slideImages,
      notes,
      pageWidth: width,
      pageHeight: halfHeight,
      layoutOptions: halfLayoutOptions,
      textOptions: halfTextOptions,
      yOffset: halfHeight,
    });

    if (index + 1 < totalSlides) {
      await drawSlideOnPage(page, pdfDoc, {
        index: index + 1,
        totalSlides,
        slideImages,
        notes,
        pageWidth: width,
        pageHeight: halfHeight,
        layoutOptions: halfLayoutOptions,
        textOptions: halfTextOptions,
        yOffset: 0,
      });
    }

    page.drawLine({
      start: { x: MARGIN, y: halfHeight },
      end: { x: width - MARGIN, y: halfHeight },
      thickness: 0.5,
      color: rgb(0.82, 0.82, 0.82),
    });
  }
}

function estimateNotesOnlyBlockHeight(content) {
  let height = 28 + HEADING_GAP;

  if (content.noteLines.length === 0) {
    height += LINE_HEIGHT;
  } else {
    height += content.noteLines.length * LINE_HEIGHT;
  }

  if (content.highlightsWithNotes.length > 0) {
    height += SECTION_GAP + HEADING_GAP;

    for (const highlight of content.highlightsWithNotes) {
      height += Math.max(highlight.lines.length, 1) * LINE_HEIGHT + 4;
    }
  }

  return height + 24;
}

function drawNotesOnlySlide(page, { content, index, totalSlides, startY, pageWidth }) {
  let y = startY;

  page.drawText(`Slide ${index + 1} / ${totalSlides}`, {
    x: MARGIN,
    y: y - 16,
    size: 14,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 32;

  page.drawText('Notes:', {
    x: MARGIN,
    y: y - 12,
    size: 12,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 22;

  if (content.noteLines.length === 0) {
    page.drawText('—', {
      x: MARGIN,
      y: y - 10,
      size: 11,
      color: rgb(0.55, 0.55, 0.55),
    });
    y -= LINE_HEIGHT + 4;
  } else {
    for (const line of content.noteLines) {
      page.drawText(line, {
        x: MARGIN,
        y: y - 10,
        size: 11,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= LINE_HEIGHT + 2;
    }
  }

  if (content.highlightsWithNotes.length > 0) {
    y -= SECTION_GAP;
    page.drawText('Highlights:', {
      x: MARGIN,
      y: y - 12,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 22;

    for (const highlight of content.highlightsWithNotes) {
      const lines = highlight.lines.length > 0 ? highlight.lines : [''];

      for (const line of lines) {
        page.drawRectangle({
          x: MARGIN,
          y: y - 10,
          width: HIGHLIGHT_DOT_SIZE,
          height: HIGHLIGHT_DOT_SIZE,
          color: hexToRgb(highlight.color),
        });

        page.drawText(line, {
          x: MARGIN + HIGHLIGHT_TEXT_INDENT,
          y: y - 10,
          size: 11,
          color: rgb(0.15, 0.15, 0.15),
        });

        y -= LINE_HEIGHT + 2;
      }

      y -= 4;
    }
  }

  return y;
}

async function exportNotesOnly(pdfDoc, { notes, totalSlides }) {
  let page = pdfDoc.addPage(A4_PORTRAIT);
  let { width, height } = page.getSize();
  let y = height - MARGIN;

  for (let index = 0; index < totalSlides; index += 1) {
    const slideData = notes[String(index)] ?? {};
    const content = buildPageContent(slideData.note ?? '', slideData);
    const blockHeight = estimateNotesOnlyBlockHeight(content);

    if (y - blockHeight < MARGIN + 40) {
      page = pdfDoc.addPage(A4_PORTRAIT);
      ({ width, height } = page.getSize());
      y = height - MARGIN;
    }

    y = drawNotesOnlySlide(page, { content, index, totalSlides, startY: y, pageWidth: width });

    if (index < totalSlides - 1) {
      y -= 12;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: width - MARGIN, y },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
      y -= 20;
    }
  }

  page.drawText('SlideNotes', {
    x: MARGIN,
    y: 24,
    size: 9,
    color: rgb(0.45, 0.45, 0.45),
  });
}

async function exportNotesPdf({ filePath, slideImages, notes, layout = '1-per-page' }) {
  const exportLayout = VALID_LAYOUTS.has(layout) ? layout : '1-per-page';
  const pdfDoc = await PDFDocument.create();
  const totalSlides = getSlideCount(slideImages, notes);

  if (totalSlides === 0) {
    throw new Error('No slides to export');
  }

  if (exportLayout === 'notes-only') {
    await exportNotesOnly(pdfDoc, { notes, totalSlides });
  } else if (exportLayout === '2-per-page') {
    await exportTwoPerPage(pdfDoc, { slideImages, notes, totalSlides });
  } else {
    await exportOnePerPage(pdfDoc, { slideImages, notes, totalSlides });
  }

  const parsed = path.parse(filePath);
  const exportPath = path.join(parsed.dir, `${parsed.name}-notes.pdf`);
  const pdfBytes = await pdfDoc.save();

  await fs.writeFile(exportPath, pdfBytes);

  return exportPath;
}

module.exports = { exportNotesPdf };
