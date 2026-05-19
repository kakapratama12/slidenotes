const fs = require('fs/promises');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const {
  darkenHighlightColor,
  sortHighlightsByPosition,
  getHighlightNumber,
} = require('./highlightNumbering');
const {
  FONT_SIZE,
  LINE_HEIGHT,
  parseNoteToBlocks,
  layoutBlocks,
  estimateLaidOutHeight,
  drawLaidOutText,
  drawLaidOutTextUpward,
  truncateLaidOut,
} = require('./noteHtmlPdf');

const A4_LANDSCAPE = [841.89, 595.28];
const A4_PORTRAIT = [595.28, 841.89];
const MARGIN = 40;
const DEFAULT_IMAGE_RATIO = 0.6;
const MIN_IMAGE_RATIO = 0.5;
const HEADING_GAP = 18;
const SECTION_GAP = 12;
const HIGHLIGHT_DOT_SIZE = 8;
const HIGHLIGHT_ENTRY_INDENT = 52;
const TEXT_MAX_WIDTH = 720;
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

async function loadFonts(pdfDoc) {
  return {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
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

function buildHighlightEntries(slideData) {
  const highlights = slideData?.highlights ?? [];

  return sortHighlightsByPosition(highlights)
    .filter((highlight) => String(highlight.note ?? '').trim())
    .map((highlight) => ({
      number: getHighlightNumber(highlights, highlight.id),
      color: highlight.color,
      lines: wrapNoteLines(`"${String(highlight.note).trim()}"`, 78),
    }));
}

function buildPageContent(noteText, slideData, fonts, maxWidth = TEXT_MAX_WIDTH) {
  const noteBlocks = parseNoteToBlocks(noteText);
  const noteLayout = layoutBlocks(noteBlocks, maxWidth, FONT_SIZE, fonts);

  return {
    noteLayout,
    highlightEntries: buildHighlightEntries(slideData),
  };
}

function estimateContentHeight(content) {
  let height = HEADING_GAP;
  const noteHeight = estimateLaidOutHeight(content.noteLayout);

  height += noteHeight > 0 ? noteHeight : LINE_HEIGHT;

  if (content.highlightEntries.length > 0) {
    height += SECTION_GAP + HEADING_GAP;

    for (const entry of content.highlightEntries) {
      height += Math.max(entry.lines.length, 1) * LINE_HEIGHT + 4;
    }
  }

  return height;
}

function truncateContent(content, maxHeight) {
  const next = {
    noteLayout: content.noteLayout.map((block) => ({
      ...block,
      lines: block.lines.map((line) => [...line]),
    })),
    highlightEntries: content.highlightEntries.map((entry) => ({
      ...entry,
      lines: [...entry.lines],
    })),
  };

  while (estimateContentHeight(next) > maxHeight) {
    const lastEntry = next.highlightEntries[next.highlightEntries.length - 1];

    if (lastEntry?.lines.length) {
      lastEntry.lines.pop();
      if (lastEntry.lines.length === 0) {
        next.highlightEntries.pop();
      }
      continue;
    }

    if (next.highlightEntries.length) {
      next.highlightEntries.pop();
      continue;
    }

    if (next.noteLayout.length) {
      const lastBlock = next.noteLayout[next.noteLayout.length - 1];
      if (lastBlock.lines.length) {
        lastBlock.lines.pop();
        if (lastBlock.lines.length === 0) {
          next.noteLayout.pop();
        }
      } else {
        next.noteLayout.pop();
      }
      continue;
    }

    break;
  }

  if (estimateLaidOutHeight(next.noteLayout) > maxHeight) {
    next.noteLayout = truncateLaidOut(next.noteLayout, maxHeight);
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

function drawHighlightNumbers(page, {
  highlights,
  imageX,
  imageY,
  imageWidth,
  imageHeight,
  fonts,
}) {
  for (const highlight of highlights) {
    const number = getHighlightNumber(highlights, highlight.id);
    if (!number) {
      continue;
    }

    const label = String(number);
    const badgeWidth = 10 + label.length * 7;
    const badgeHeight = 16;
    const badgeX = imageX + highlight.x * imageWidth + 4;
    const badgeY = imageY + imageHeight - highlight.y * imageHeight - badgeHeight - 4;

    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeWidth,
      height: badgeHeight,
      color: hexToRgb(darkenHighlightColor(highlight.color)),
    });

    const textWidth = fonts.bold.widthOfTextAtSize(label, 9);
    page.drawText(label, {
      x: badgeX + (badgeWidth - textWidth) / 2,
      y: badgeY + 4,
      size: 9,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });
  }
}

function drawHighlightEntryUpward(page, entry, x, textY, fonts) {
  const lines = entry.lines.length > 0 ? entry.lines : ['""'];
  const label = `[${entry.number}]`;
  const labelWidth = fonts.bold.widthOfTextAtSize(label, FONT_SIZE);
  let y = textY;

  for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
    if (lineIndex === lines.length - 1) {
      page.drawText(label, {
        x,
        y,
        size: FONT_SIZE,
        font: fonts.bold,
        color: rgb(0.15, 0.15, 0.15),
      });

      page.drawRectangle({
        x: x + labelWidth + 6,
        y: y - 1,
        width: HIGHLIGHT_DOT_SIZE,
        height: HIGHLIGHT_DOT_SIZE,
        color: hexToRgb(entry.color),
      });

      page.drawText(lines[lineIndex], {
        x: x + labelWidth + 6 + HIGHLIGHT_DOT_SIZE + 6,
        y,
        size: FONT_SIZE,
        font: fonts.regular,
        color: rgb(0.15, 0.15, 0.15),
      });
    } else {
      page.drawText(lines[lineIndex], {
        x: x + HIGHLIGHT_ENTRY_INDENT,
        y,
        size: FONT_SIZE,
        font: fonts.regular,
        color: rgb(0.15, 0.15, 0.15),
      });
    }

    y += LINE_HEIGHT;
  }

  return y + 4;
}

function drawHighlightEntryDownward(page, entry, x, y, fonts) {
  const lines = entry.lines.length > 0 ? entry.lines : ['""'];
  const label = `[${entry.number}]`;
  const labelWidth = fonts.bold.widthOfTextAtSize(label, FONT_SIZE);
  let cursorY = y;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (lineIndex === 0) {
      page.drawText(label, {
        x,
        y: cursorY,
        size: FONT_SIZE,
        font: fonts.bold,
        color: rgb(0.15, 0.15, 0.15),
      });

      page.drawRectangle({
        x: x + labelWidth + 6,
        y: cursorY - 1,
        width: HIGHLIGHT_DOT_SIZE,
        height: HIGHLIGHT_DOT_SIZE,
        color: hexToRgb(entry.color),
      });

      page.drawText(lines[lineIndex], {
        x: x + labelWidth + 6 + HIGHLIGHT_DOT_SIZE + 6,
        y: cursorY,
        size: FONT_SIZE,
        font: fonts.regular,
        color: rgb(0.15, 0.15, 0.15),
      });
    } else {
      page.drawText(lines[lineIndex], {
        x: x + HIGHLIGHT_ENTRY_INDENT,
        y: cursorY,
        size: FONT_SIZE,
        font: fonts.regular,
        color: rgb(0.15, 0.15, 0.15),
      });
    }

    cursorY -= LINE_HEIGHT + 2;
  }

  return cursorY;
}

function drawTextBlock(page, { content, totalSlides, index, fonts, textOptions = {} }) {
  const {
    textBaseY = MARGIN + 40,
    footerY = 24,
    showPageFooter = true,
    yOffset = 0,
    maxWidth = TEXT_MAX_WIDTH,
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

  for (let entryIndex = content.highlightEntries.length - 1; entryIndex >= 0; entryIndex -= 1) {
    textY = drawHighlightEntryUpward(page, content.highlightEntries[entryIndex], MARGIN, textY, fonts);
  }

  if (content.highlightEntries.length > 0) {
    page.drawText('Highlight Notes:', {
      x: MARGIN,
      y: textY,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
    });
    textY += HEADING_GAP + SECTION_GAP;
  }

  if (content.noteLayout.length === 0) {
    page.drawText('—', {
      x: MARGIN,
      y: textY,
      size: FONT_SIZE,
      color: rgb(0.55, 0.55, 0.55),
    });
    textY += LINE_HEIGHT;
  } else {
    textY = drawLaidOutTextUpward(page, content.noteLayout, {
      x: MARGIN,
      startY: textY,
      rgb,
      fontSize: FONT_SIZE,
    });
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
  fonts,
  pageWidth,
  pageHeight,
  layoutOptions,
  textOptions,
  yOffset = 0,
}) {
  const slideData = notes[String(index)] ?? {};
  const pageContent = buildPageContent(slideData.note ?? '', slideData, fonts, textOptions.maxWidth);
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

  drawHighlightNumbers(page, {
    highlights: slideData.highlights ?? [],
    imageX,
    imageY,
    imageWidth,
    imageHeight,
    fonts,
  });

  drawTextBlock(page, {
    content: layout.content,
    totalSlides,
    index,
    fonts,
    textOptions: {
      ...textOptions,
      yOffset,
    },
  });
}

async function exportOnePerPage(pdfDoc, { slideImages, notes, totalSlides, fonts }) {
  for (let index = 0; index < totalSlides; index += 1) {
    const page = pdfDoc.addPage(A4_LANDSCAPE);
    const { width, height } = page.getSize();

    await drawSlideOnPage(page, pdfDoc, {
      index,
      totalSlides,
      slideImages,
      notes,
      fonts,
      pageWidth: width,
      pageHeight: height,
      textOptions: { showPageFooter: true },
    });
  }
}

async function exportTwoPerPage(pdfDoc, { slideImages, notes, totalSlides, fonts }) {
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
    maxWidth: 360,
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
      fonts,
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
        fonts,
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
  const noteHeight = estimateLaidOutHeight(content.noteLayout);

  height += noteHeight > 0 ? noteHeight : LINE_HEIGHT;

  if (content.highlightEntries.length > 0) {
    height += SECTION_GAP + HEADING_GAP;

    for (const entry of content.highlightEntries) {
      height += Math.max(entry.lines.length, 1) * LINE_HEIGHT + 4;
    }
  }

  return height + 24;
}

function drawNotesOnlySlide(page, { content, index, totalSlides, startY, fonts }) {
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

  if (content.noteLayout.length === 0) {
    page.drawText('—', {
      x: MARGIN,
      y: y - 10,
      size: 11,
      color: rgb(0.55, 0.55, 0.55),
    });
    y -= LINE_HEIGHT + 4;
  } else {
    y = drawLaidOutText(page, content.noteLayout, {
      x: MARGIN,
      startY: y - 10,
      rgb,
      fontSize: 11,
    });
    y -= 4;
  }

  if (content.highlightEntries.length > 0) {
    y -= SECTION_GAP;
    page.drawText('Highlight Notes:', {
      x: MARGIN,
      y: y - 12,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 22;

    for (const entry of content.highlightEntries) {
      y = drawHighlightEntryDownward(page, entry, MARGIN, y - 10, fonts);
      y -= 4;
    }
  }

  return y;
}

async function exportNotesOnly(pdfDoc, { notes, totalSlides, fonts }) {
  let page = pdfDoc.addPage(A4_PORTRAIT);
  let { width, height } = page.getSize();
  let y = height - MARGIN;

  for (let index = 0; index < totalSlides; index += 1) {
    const slideData = notes[String(index)] ?? {};
    const content = buildPageContent(slideData.note ?? '', slideData, fonts);
    const blockHeight = estimateNotesOnlyBlockHeight(content);

    if (y - blockHeight < MARGIN + 40) {
      page = pdfDoc.addPage(A4_PORTRAIT);
      ({ width, height } = page.getSize());
      y = height - MARGIN;
    }

    y = drawNotesOnlySlide(page, { content, index, totalSlides, startY: y, fonts });

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
  const fonts = await loadFonts(pdfDoc);
  const totalSlides = getSlideCount(slideImages, notes);

  if (totalSlides === 0) {
    throw new Error('No slides to export');
  }

  if (exportLayout === 'notes-only') {
    await exportNotesOnly(pdfDoc, { notes, totalSlides, fonts });
  } else if (exportLayout === '2-per-page') {
    await exportTwoPerPage(pdfDoc, { slideImages, notes, totalSlides, fonts });
  } else {
    await exportOnePerPage(pdfDoc, { slideImages, notes, totalSlides, fonts });
  }

  const parsed = path.parse(filePath);
  const exportPath = path.join(parsed.dir, `${parsed.name}-notes.pdf`);
  const pdfBytes = await pdfDoc.save();

  await fs.writeFile(exportPath, pdfBytes);

  return exportPath;
}

module.exports = { exportNotesPdf };
