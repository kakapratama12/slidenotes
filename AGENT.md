# AGENT.md
## SlideNotes — Presentation Note-Taking App for macOS

This file provides context for AI coding assistants working on this project.
Read this before writing any code.

---

## Project Overview

SlideNotes is a **macOS desktop application** built with Electron.
Users open a `.pdf` file, view each page as a slide, and write notes per slide —
all stored locally with no cloud dependency.

Core loop:
```
Open PDF → View slide + Write notes → Auto-save to JSON → Export as PDF
```

Key design decisions:
- **PDF only for MVP** — no PPTX support, no LibreOffice dependency. User converts PPTX to PDF themselves via PowerPoint/Keynote.
- **Local-first** — no backend, no database, no accounts, no internet required
- **Single user** — no multi-tenancy, no auth
- **macOS only** — distributed as a `.app` bundle, double-click to open
- **Zero terminal for end user** — engineer builds once, user just opens the app

---

## Tech Stack

### Desktop Shell
- **Electron 30+** — Chromium renderer + Node.js main process
- **electron-builder** — packages the app into a `.app` bundle for macOS

### Frontend (Renderer Process)
- **React 18** — UI components
- **Vite** — bundler and dev server
- **Tailwind CSS** — styling

### Slide Rendering
- **pdf.js (Mozilla)** — renders PDF pages as canvas in renderer; one page = one slide
- No LibreOffice, no native conversion — PDF is the source format

### Notes Persistence
- **Node.js `fs` module** — reads/writes `.slidenotes.json` files to disk
- **Only accessible from main process** — renderer uses IPC to request reads/writes

### Export
- **pdf-lib** — composites slide images + notes text into a new PDF (main process)

---

## Architecture — Process Boundary (CRITICAL)

Electron has two processes. Violating this boundary is the most common bug source.

```
┌─────────────────────────────────┐     IPC      ┌──────────────────────────────────┐
│        MAIN PROCESS             │ ◄──────────► │      RENDERER PROCESS            │
│  (Node.js — full OS access)     │              │  (Chromium — no OS access)       │
│                                 │              │                                  │
│  - File system (fs)             │              │  - React UI                      │
│  - Native file picker dialog    │              │  - pdf.js slide rendering        │
│  - Read/write .slidenotes.json  │              │  - Notes text area               │
│  - PDF export via pdf-lib       │              │  - Thumbnail sidebar             │
│  - App lifecycle                │              │  - Highlight overlay (SVG)       │
└─────────────────────────────────┘              └──────────────────────────────────┘
```

**Rules — non-negotiable:**
- Renderer NEVER calls `fs`, `path`, `child_process`, or any Node.js built-in directly
- All file I/O goes through `ipcRenderer.invoke(...)` → `ipcMain.handle(...)`
- `contextBridge` exposes a safe `window.electronAPI` object to renderer — nothing else
- Never set `nodeIntegration: true` in BrowserWindow — use preload script instead

```js
// CORRECT — renderer calls IPC
const notes = await window.electronAPI.loadNotes(filePath);

// WRONG — renderer accessing Node.js directly
const fs = require('fs'); // ❌ never do this in renderer
```

---

## IPC API Contract

All IPC channels are defined in `electron/preload.js` and handled in `electron/main.js`.

| Channel | Direction | Input | Output |
|---|---|---|---|
| `open-file-dialog` | renderer → main | — | `string \| null` (file path) |
| `load-notes` | renderer → main | `filePath: string` | `NotesFile \| null` |
| `save-notes` | renderer → main | `{ filePath, notes }` | `{ ok: boolean }` |
| `export-pdf` | renderer → main | `{ filePath, slideImages, notes }` | `{ ok: boolean, exportPath: string }` |

Preload pattern — always use `contextBridge.exposeInMainWorld`:

```js
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  loadNotes: (filePath) => ipcRenderer.invoke('load-notes', filePath),
  saveNotes: (filePath, notes) => ipcRenderer.invoke('save-notes', { filePath, notes }),
  exportPdf: (filePath, slideImages, notes) => ipcRenderer.invoke('export-pdf', { filePath, slideImages, notes }),
});
```

---

## Notes Storage Format

Notes are saved as a JSON file alongside the source PDF.

**File naming:**
```
~/Documents/lecture.pdf  →  ~/Documents/lecture.slidenotes.json
```

**JSON schema:**
```json
{
  "version": 1,
  "sourceFile": "/Users/alice/Documents/lecture.pdf",
  "lastOpened": "2026-05-19T10:00:00Z",
  "slides": {
    "0": {
      "note": "Intro to sociological imagination...",
      "highlights": []
    },
    "1": {
      "note": "C. Wright Mills — 1959",
      "highlights": []
    }
  }
}
```

**Rules:**
- Slide index is **0-based** string key (not integer) for JSON compatibility
- Highlight coordinates are **normalized 0–1** (relative to slide dimensions) — never pixels
- `highlights` defaults to empty array — reserved for Should Have milestone
- `lastOpened` is ISO 8601 UTC
- Never delete this file — it is the user's data

---

## Project Structure

```
slidenotes/
├── AGENT.md                      ← you are here
├── PRD.md
├── SlideNotes_Tasks.md
├── package.json
├── vite.config.js
├── tailwind.config.js
│
├── electron/
│   ├── main.js                   ← app lifecycle, ipcMain handlers, BrowserWindow
│   ├── preload.js                ← contextBridge — ONLY file that bridges main↔renderer
│   └── exporter.js               ← pdf-lib export logic
│
├── src/
│   ├── main.jsx                  ← React entry point, pdf.js worker init
│   ├── App.jsx                   ← root component, holds global state
│   │
│   ├── components/
│   │   ├── DropZone.jsx          ← empty state, drag-and-drop + file picker button
│   │   ├── ThumbnailBar.jsx      ← left sidebar, scrollable slide thumbnails
│   │   ├── SlideViewer.jsx       ← center panel, renders current slide via pdf.js
│   │   ├── HighlightOverlay.jsx  ← SVG canvas overlay (Should Have)
│   │   └── NotesPanel.jsx        ← right panel, textarea + auto-save indicator
│   │
│   └── hooks/
│       ├── useNotes.js           ← load, save, debounced auto-save logic
│       └── useSlides.js          ← slide navigation, page count, current index
│
├── public/
│   └── pdf.worker.min.js         ← pdf.js worker (copy from pdfjs-dist)
│
└── dist/                         ← electron-builder output (git-ignored)
```

---

## Coding Patterns

### State lives in App.jsx

Global state is managed in `App.jsx` and passed down as props.
Do not use Redux or Zustand for MVP — React state is sufficient.

```
App.jsx state:
  - filePath: string | null
  - pageCount: number
  - currentIndex: number
  - notes: Record<string, SlideNote>   ← { "0": { note, highlights }, ... }
  - saveStatus: 'saved' | 'saving' | 'error'
```

### Auto-save with debounce

Notes are saved on every keystroke via debounce — never on blur only.

```js
// hooks/useNotes.js
const saveDebounced = useMemo(() =>
  debounce(async (filePath, notes) => {
    await window.electronAPI.saveNotes(filePath, notes);
  }, 800),
[]);
```

### pdf.js initialization

pdf.js worker must be set before any document is loaded:

```js
// src/main.jsx — run once at startup
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
```

### Highlight coordinates — always normalized

Store and read highlights as 0–1 fractions. Convert to pixels only at render time.

```js
// CORRECT — store normalized
const highlight = { x: mouseX / canvasWidth, y: mouseY / canvasHeight, ... };

// CORRECT — render by multiplying
const pixelX = highlight.x * canvasWidth;

// WRONG — store pixel values
const highlight = { x: 340, y: 120, ... }; // ❌ breaks on resize
```

---

## Forbidden Patterns

| ❌ Never do | ✅ Do instead |
|---|---|
| `nodeIntegration: true` in BrowserWindow | Use preload + contextBridge |
| `require('fs')` in renderer/React | Call `window.electronAPI.*` via IPC |
| Pixel-based highlight coords in JSON | Normalized 0–1 coords |
| Save notes only on window close | Auto-save debounced on keystroke |
| Any mention of LibreOffice or PPTX conversion | MVP is PDF-only, no conversion needed |
| Store slide index as 1-based in JSON | Always 0-based string keys |
| Load remote URLs in BrowserWindow | `loadFile()` only for local HTML |

---

## What "Done" Looks Like

### MVP — S1 + S2 + S3 (Must Have)
- [ ] Open `.pdf` via drag-drop or file picker
- [ ] Slides rendered correctly via pdf.js
- [ ] Thumbnail sidebar, click to navigate
- [ ] Prev/Next navigation + keyboard arrows
- [ ] Notes textarea per slide
- [ ] Auto-save to `.slidenotes.json` (debounced)
- [ ] Notes reload when same file is reopened
- [ ] Export slides + notes as PDF
- [ ] App builds to `.app` via `npm run build`

### S4 — Should Have
- [ ] Highlight overlay — draw boxes on slide, stored in JSON

### Future
- [ ] Dark mode, zoom, full-text search

---

## Common Commands

```bash
# Development
npm install
npm run dev          # starts Vite + Electron in dev mode with hot reload

# Build
npm run build        # bundles React → electron-builder → dist/mac/SlideNotes.app
```

---

## Security Notes

- Never set `contextIsolation: false` — keep it `true` (Electron default)
- Never set `nodeIntegration: true` — always use preload script
- `preload.js` is the only file allowed to use `ipcRenderer`
- Do not load remote URLs in BrowserWindow — `loadFile()` only

---

*Update this file when architecture decisions, IPC channels, or storage format changes.*