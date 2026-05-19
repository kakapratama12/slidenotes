const fs = require('fs/promises');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const A4_LANDSCAPE = [841.89, 595.28];
const MARGIN = 40;

function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
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

  return lines.slice(0, 18);
}

async function exportNotesPdf({ filePath, slideImages, notes }) {
  const pdfDoc = await PDFDocument.create();
  const totalSlides = slideImages.length;

  for (let index = 0; index < totalSlides; index += 1) {
    const page = pdfDoc.addPage(A4_LANDSCAPE);
    const { width, height } = page.getSize();
    const slideTopHeight = height * 0.6;
    const notesAreaTop = height * 0.4;

    const imageBytes = dataUrlToBuffer(slideImages[index]);
    const image = await pdfDoc.embedPng(imageBytes);
    const imageScale = Math.min(
      (width - MARGIN * 2) / image.width,
      (slideTopHeight - MARGIN) / image.height,
    );
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

    const noteText = notes[String(index)]?.note ?? '';
    let textY = notesAreaTop - 24;

    page.drawText('Notes:', {
      x: MARGIN,
      y: textY,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
    });

    textY -= 18;
    const noteLines = wrapNoteLines(noteText);

    if (noteLines.length === 0) {
      page.drawText('', { x: MARGIN, y: textY, size: 10 });
    } else {
      for (const line of noteLines) {
        page.drawText(line, {
          x: MARGIN,
          y: textY,
          size: 10,
          color: rgb(0.15, 0.15, 0.15),
        });
        textY -= 14;
        if (textY < MARGIN + 30) {
          break;
        }
      }
    }

    page.drawText(`Slide ${index + 1} / ${totalSlides} · SlideNotes`, {
      x: MARGIN,
      y: 24,
      size: 9,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  const parsed = path.parse(filePath);
  const exportPath = path.join(parsed.dir, `${parsed.name}-notes.pdf`);
  const pdfBytes = await pdfDoc.save();

  await fs.writeFile(exportPath, pdfBytes);

  return exportPath;
}

module.exports = { exportNotesPdf };
