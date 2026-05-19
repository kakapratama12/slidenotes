const LINE_HEIGHT = 14;
const LIST_INDENT = 16;
const FONT_SIZE = 10;

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

function layoutRunsIntoLines(runs, maxWidth, fontSize, fonts) {
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  const pushLine = () => {
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
        pushLine();
        continue;
      }

      const font = pickFont(fonts, run);
      const width = font.widthOfTextAtSize(part, fontSize);

      if (currentWidth + width > maxWidth && currentLine.length > 0) {
        pushLine();
      }

      currentLine.push({ text: part, font, bold: run.bold, italic: run.italic });
      currentWidth += width;
    }
  }

  pushLine();
  return lines;
}

function layoutBlocks(blocks, maxWidth, fontSize, fonts) {
  const laidOut = [];

  for (const block of blocks) {
    const prefix =
      block.type === 'bullet' ? '• ' : block.type === 'ordered' ? `${block.order}. ` : '';
    const prefixWidth =
      prefix.length > 0
        ? fonts.regular.widthOfTextAtSize(prefix, fontSize)
        : 0;
    const contentWidth = Math.max(40, maxWidth - (block.type === 'paragraph' ? 0 : LIST_INDENT));
    const lines = layoutRunsIntoLines(block.runs, contentWidth - prefixWidth, fontSize, fonts);

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

function truncateLaidOut(laidOut, maxHeight) {
  const next = laidOut.map((block) => ({
    ...block,
    lines: block.lines.map((line) => [...line]),
  }));

  while (estimateLaidOutHeight(next) > maxHeight) {
    const lastBlock = next[next.length - 1];

    if (!lastBlock) {
      break;
    }

    if (lastBlock.lines.length) {
      lastBlock.lines.pop();
      if (lastBlock.lines.length === 0) {
        next.pop();
      }
      continue;
    }

    next.pop();
  }

  return next;
}

module.exports = {
  FONT_SIZE,
  LINE_HEIGHT,
  LIST_INDENT,
  parseNoteToBlocks,
  layoutBlocks,
  estimateLaidOutHeight,
  drawLaidOutText,
  drawLaidOutTextUpward,
  truncateLaidOut,
};
