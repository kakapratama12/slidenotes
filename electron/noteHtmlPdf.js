const LINE_HEIGHT = 14;
const LIST_INDENT = 16;
const FONT_SIZE = 10;
const HIGHLIGHT_ENTRY_INDENT = 52;
const HIGHLIGHT_DOT_SIZE = 8;

function decodeHtmlEntities(text) {
  return String(text ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isHtmlNote(note) {
  return /<[a-z][\s\S]*>/i.test(String(note ?? '').trim());
}

function parseInlineHtml(html) {
  const runs = [];
  const stack = [{ bold: false, italic: false }];
  const tokenRegex = /<(\/?)(strong|b|em|i|br)\b[^>]*>|([^<]+)/gi;
  let match = tokenRegex.exec(html);

  while (match) {
    const isClosing = Boolean(match[1]);
    const tag = match[2]?.toLowerCase();
    const text = match[3];
    const style = stack[stack.length - 1];

    if (text) {
      const decoded = decodeHtmlEntities(text);
      const parts = decoded.split(/(\n)/);

      for (const part of parts) {
        if (!part) {
          continue;
        }

        if (part === '\n') {
          runs.push({ text: '\n', bold: style.bold, italic: style.italic, break: true });
          continue;
        }

        const normalized = part.replace(/\s+/g, ' ');
        if (normalized.trim()) {
          runs.push({ text: normalized, bold: style.bold, italic: style.italic });
        }
      }
    } else if (tag === 'br' && !isClosing) {
      runs.push({ text: '\n', bold: style.bold, italic: style.italic, break: true });
    } else if (tag === 'strong' || tag === 'b') {
      if (isClosing) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else {
        stack.push({ bold: true, italic: style.italic });
      }
    } else if (tag === 'em' || tag === 'i') {
      if (isClosing) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else {
        stack.push({ bold: style.bold, italic: true });
      }
    }

    match = tokenRegex.exec(html);
  }

  return runs;
}

function parsePlainNote(note) {
  return String(note)
    .split(/\n\n+/)
    .map((paragraph) => ({
      type: 'paragraph',
      runs: [{ text: paragraph.replace(/\n/g, ' ') }],
    }))
    .filter((block) => block.runs.some((run) => run.text.trim()));
}

function parseHtmlNote(html) {
  const blocks = [];
  const blockRegex = /<(p|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match = blockRegex.exec(html);

  if (!match) {
    const runs = parseInlineHtml(html);
    if (runs.length) {
      blocks.push({ type: 'paragraph', runs });
    }
    return blocks;
  }

  while (match) {
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag === 'p') {
      const runs = parseInlineHtml(inner);
      if (runs.length) {
        blocks.push({ type: 'paragraph', runs });
      }
    } else {
      const itemRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let itemMatch = itemRegex.exec(inner);
      let order = 1;

      while (itemMatch) {
        const itemHtml = itemMatch[1].replace(/<\/?p[^>]*>/gi, '');
        const runs = parseInlineHtml(itemHtml);

        if (runs.length) {
          blocks.push({
            type: tag === 'ol' ? 'ordered' : 'bullet',
            order,
            runs,
          });
          order += 1;
        }

        itemMatch = itemRegex.exec(inner);
      }
    }

    match = blockRegex.exec(html);
  }

  return blocks;
}

function parseNoteToBlocks(note) {
  if (!note || !String(note).trim()) {
    return [];
  }

  if (!isHtmlNote(note)) {
    return parsePlainNote(note);
  }

  return parseHtmlNote(note);
}

function pickFont(fonts, run) {
  if (run.bold && run.italic) {
    return fonts.boldItalic;
  }

  if (run.bold) {
    return fonts.bold;
  }

  if (run.italic) {
    return fonts.italic;
  }

  return fonts.regular;
}

/**
 * Word-wrap plain text using font metrics (pdf-lib).
 */
function wrapText(text, maxWidth, fontSize, font) {
  if (!text || !String(text).trim()) {
    return [];
  }

  const lines = [];
  const paragraphs = String(text).split(/\n/);

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';

    for (const word of words) {
      let remaining = word;

      while (remaining) {
        const candidate = line ? `${line} ${remaining}` : remaining;
        const width = font.widthOfTextAtSize(candidate, fontSize);

        if (width <= maxWidth) {
          line = candidate;
          remaining = '';
          continue;
        }

        if (line) {
          lines.push(line);
          line = '';
          continue;
        }

        let chunk = '';
        for (const char of remaining) {
          const next = chunk + char;
          if (font.widthOfTextAtSize(next, fontSize) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk = next;
          }
        }

        if (chunk) {
          lines.push(chunk);
        }
        remaining = '';
      }
    }

    if (line) {
      lines.push(line);
    }
  }

  return lines;
}

function layoutRunsIntoLines(runs, maxWidth, fontSize, fonts) {
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  const pushCurrentLine = () => {
    if (currentLine.length) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
  };

  for (const run of runs) {
    const parts = run.text.split(/(\s+)/).filter((part) => part.length > 0);

    for (const part of parts) {
      if (part === '\n' || run.break) {
        pushCurrentLine();
        continue;
      }

      const font = pickFont(fonts, run);
      const width = font.widthOfTextAtSize(part, fontSize);

      if (currentWidth + width > maxWidth && currentLine.length > 0) {
        pushCurrentLine();
      }

      if (font.widthOfTextAtSize(part, fontSize) > maxWidth) {
        pushCurrentLine();
        let chunk = '';
        for (const char of part) {
          const next = chunk + char;
          if (font.widthOfTextAtSize(next, fontSize) > maxWidth && chunk) {
            lines.push([{ text: chunk, font, bold: run.bold, italic: run.italic }]);
            chunk = char;
          } else {
            chunk = next;
          }
        }
        if (chunk) {
          currentLine = [{ text: chunk, font, bold: run.bold, italic: run.italic }];
          currentWidth = font.widthOfTextAtSize(chunk, fontSize);
        }
        continue;
      }

      currentLine.push({ text: part, font, bold: run.bold, italic: run.italic });
      currentWidth += width;
    }
  }

  pushCurrentLine();
  return lines;
}

function layoutBlocks(blocks, maxWidth, fontSize, fonts) {
  const laidOut = [];

  for (const block of blocks) {
    const prefix =
      block.type === 'bullet' ? '• ' : block.type === 'ordered' ? `${block.order}. ` : '';
    const prefixWidth =
      prefix.length > 0 ? fonts.regular.widthOfTextAtSize(prefix, fontSize) : 0;
    const contentWidth = Math.max(40, maxWidth - (block.type === 'paragraph' ? 0 : LIST_INDENT));
    const lines = layoutRunsIntoLines(
      block.runs,
      Math.max(40, contentWidth - prefixWidth),
      fontSize,
      fonts,
    );

    laidOut.push({
      type: block.type,
      prefix,
      prefixWidth,
      indent: block.type === 'paragraph' ? 0 : LIST_INDENT,
      lines,
    });
  }

  return laidOut;
}

function estimateLaidOutHeight(laidOut) {
  let height = 0;

  for (const block of laidOut) {
    const lineCount = Math.max(block.lines.length, 1);
    height += lineCount * LINE_HEIGHT + 2;
  }

  return height;
}

function estimateHighlightEntryHeight(entry) {
  return Math.max(entry.lines.length, 1) * LINE_HEIGHT + 4;
}

function estimateContentBodyHeight(content) {
  let height = estimateLaidOutHeight(content.noteLayout);

  if (height === 0) {
    height = LINE_HEIGHT;
  }

  if (content.highlightEntries.length > 0) {
    height += 12 + 18;

    for (const entry of content.highlightEntries) {
      height += estimateHighlightEntryHeight(entry);
    }
  }

  return height;
}

function getImageRatioForBodyHeight(bodyHeight, { isHalfPage = false } = {}) {
  const shortThreshold = isHalfPage ? 55 : 100;
  const mediumThreshold = isHalfPage ? 110 : 200;

  if (bodyHeight < shortThreshold) {
    return 0.6;
  }

  if (bodyHeight < mediumThreshold) {
    return 0.5;
  }

  return 0.3;
}

function cloneContent(content) {
  return {
    noteLayout: content.noteLayout.map((block) => ({
      ...block,
      lines: block.lines.map((line) => [...line]),
    })),
    highlightEntries: content.highlightEntries.map((entry) => ({
      ...entry,
      lines: [...entry.lines],
    })),
  };
}

function splitNoteBlockLines(block, maxLines) {
  if (maxLines <= 0) {
    return { kept: null, rest: block };
  }

  if (block.lines.length <= maxLines) {
    return { kept: block, rest: null };
  }

  return {
    kept: { ...block, lines: block.lines.slice(0, maxLines) },
    rest: { ...block, lines: block.lines.slice(maxLines) },
  };
}

function splitContentByHeight(content, maxHeight) {
  if (maxHeight <= 0) {
    return { first: { noteLayout: [], highlightEntries: [] }, overflow: [cloneContent(content)] };
  }

  const source = cloneContent(content);
  const first = { noteLayout: [], highlightEntries: [] };
  const overflow = [];
  let bucket = first;
  let used = 0;

  const startOverflowBucket = () => {
    const next = { noteLayout: [], highlightEntries: [] };
    overflow.push(next);
    bucket = next;
    used = 0;
  };

  const fits = (extra) => used + extra <= maxHeight;

  for (const block of source.noteLayout) {
    let remaining = block;

    while (remaining) {
      const availableLines = Math.floor((maxHeight - used) / LINE_HEIGHT);
      if (availableLines <= 0) {
        startOverflowBucket();
        continue;
      }

      const { kept, rest } = splitNoteBlockLines(remaining, availableLines);
      if (kept) {
        bucket.noteLayout.push(kept);
        used += kept.lines.length * LINE_HEIGHT + 2;
      }

      remaining = rest;
      if (remaining) {
        startOverflowBucket();
      }
    }
  }

  if (source.highlightEntries.length > 0) {
    if (bucket.highlightEntries.length === 0 && bucket.noteLayout.length > 0) {
      if (!fits(12 + 18)) {
        startOverflowBucket();
      } else {
        used += 12 + 18;
      }
    } else if (bucket.highlightEntries.length === 0 && bucket.noteLayout.length === 0) {
      used += 12 + 18;
    }

    for (const entry of source.highlightEntries) {
      const entryHeight = estimateHighlightEntryHeight(entry);
      if (!fits(entryHeight)) {
        if (bucket.noteLayout.length || bucket.highlightEntries.length) {
          startOverflowBucket();
        } else if (used > 0) {
          startOverflowBucket();
        }
      }

      let lineStart = 0;
      while (lineStart < entry.lines.length) {
        const availableLines = Math.max(
          1,
          Math.floor((maxHeight - used) / LINE_HEIGHT),
        );
        const slice = entry.lines.slice(lineStart, lineStart + availableLines);
        if (!slice.length) {
          startOverflowBucket();
          continue;
        }

        bucket.highlightEntries.push({
          number: entry.number,
          color: entry.color,
          lines: slice,
        });
        used += slice.length * LINE_HEIGHT + 4;
        lineStart += slice.length;

        if (lineStart < entry.lines.length) {
          startOverflowBucket();
        }
      }
    }
  }

  const hasFirst =
    first.noteLayout.length > 0 || first.highlightEntries.length > 0 || source.noteLayout.length === 0;

  return {
    first: hasFirst ? first : { noteLayout: [], highlightEntries: [] },
    overflow,
  };
}

function drawLineSegments(page, block, line, lineIndex, { x, y, rgb, fontSize }) {
  let cursorX = x + block.indent;

  if (lineIndex === 0 && block.prefix) {
    page.drawText(block.prefix, {
      x: cursorX,
      y,
      size: fontSize,
      font: line[0]?.font,
      color: rgb(0.15, 0.15, 0.15),
    });
    cursorX += block.prefixWidth;
  }

  for (const segment of line) {
    page.drawText(segment.text, {
      x: cursorX,
      y,
      size: fontSize,
      font: segment.font,
      color: rgb(0.15, 0.15, 0.15),
    });
    cursorX += segment.font.widthOfTextAtSize(segment.text, fontSize);
  }
}

function drawLaidOutText(page, laidOut, { x, startY, rgb, fontSize = FONT_SIZE }) {
  let y = startY;

  for (const block of laidOut) {
    for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex += 1) {
      drawLineSegments(page, block, block.lines[lineIndex], lineIndex, {
        x,
        y,
        rgb,
        fontSize,
      });
      y -= LINE_HEIGHT;
    }

    y -= 2;
  }

  return y;
}

function drawLaidOutTextUpward(page, laidOut, { x, startY, rgb, fontSize = FONT_SIZE }) {
  let y = startY;

  for (let blockIndex = laidOut.length - 1; blockIndex >= 0; blockIndex -= 1) {
    const block = laidOut[blockIndex];

    for (let lineIndex = block.lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
      drawLineSegments(page, block, block.lines[lineIndex], lineIndex, {
        x,
        y,
        rgb,
        fontSize,
      });
      y += LINE_HEIGHT;
    }

    y += 2;
  }

  return y;
}

module.exports = {
  FONT_SIZE,
  LINE_HEIGHT,
  LIST_INDENT,
  HIGHLIGHT_ENTRY_INDENT,
  HIGHLIGHT_DOT_SIZE,
  wrapText,
  parseNoteToBlocks,
  layoutBlocks,
  estimateLaidOutHeight,
  estimateContentBodyHeight,
  estimateHighlightEntryHeight,
  getImageRatioForBodyHeight,
  splitContentByHeight,
  drawLaidOutText,
  drawLaidOutTextUpward,
};
