# AGENT.md
## SlideNotes — Presentation Note-Taking App for macOS

This file provides context for AI coding assistants working on this project.
Read this before writing any code.

---

## Project Overview

SlideNotes is a **macOS desktop application** built with Electron.
Users upload a `.pptx` or `.pdf` file, view each slide, and write notes per slide —
all stored locally with no cloud dependency.

Core loop:
```
Upload file → Convert to slides → View slide + Write notes → Auto-save to JSON
```

Key design decisions:
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
- **LibreOffice (headless)** — converts `.pptx` → `.pdf` via `child_process` in main process
- **pdf.js (Mozilla)** — renders PDF pages as canvas in renderer; one page = one slide

### Notes Persistence
- **Node.js `fs` module** — reads/writes `.slidenotes.json` files to disk
- **Only accessible from main process** — renderer uses IPC to request reads/writes

---

## Architecture — Process Boundary (CRITICAL)

Electron has two processes. Violating this boundary is the most common bug source.

```
┌─────────────────────────────────┐     IPC      ┌──────────────────────────────────┐
│        MAIN PROCESS             │ ◄──────────► │      RENDERER PROCESS            │
│  (Node.js — full OS access)     │              │  (Chromium — no OS access)       │
│                                 │              │                                  │
│  - File system (fs)             │              │  - React UI                      │
│  - LibreOffice conversion       │              │  - pdf.js slide rendering        │
│  - Native file picker dialog    │              │  - Notes text area               │
│  - Read/write .slidenotes.json  │              │  - Thumbnail sidebar             │
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
| `convert-file` | renderer → main | `filePath: string` | `{ pdfPath: string, pageCount: number }` |
| `load-notes` | renderer → main | `filePath: string` | `NotesFile \| null` |
| `save-notes` | renderer → main | `{ filePath, notes }` | `{ ok: boolean }` |
| `export-notes` | renderer → main | `{ filePath, notes }` | `{ ok: boolean }` |
| `get-page-image` | renderer → main | `{ pdfPath, pageIndex }` | `dataURL: string` |

Preload pattern — always use `contextBridge.exposeInMainWorld`:

```js
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  convertFile: (filePath) => ipcRenderer.invoke('convert-file', filePath),
  loadNotes: (filePath) => ipcRenderer.invoke('load-notes', filePath),
  saveNotes: (filePath, notes) => ipcRenderer.invoke('save-notes', { filePath, notes }),
  exportNotes: (filePath, notes) => ipcRenderer.invoke('export-notes', { filePath, notes }),
  getPageImage: (pdfPath, pageIndex) => ipcRenderer.invoke('get-page-image', { pdfPath, pageIndex }),
});
```

---

## Notes Storage Format

Notes are saved as a JSON file alongside the source file.

**File naming:**
```
my-lecture.pptx  →  my-lecture.slidenotes.json
my-lecture.pdf   →  my-lecture.slidenotes.json
```

**JSON schema:**
```json
{
  "version": 1,
  "sourceFile": "/Users/alice/Documents/my-lecture.pptx",
  "lastOpened": "2026-05-19T10:00:00Z",
  "slides": {
    "0": {
      "note": "Intro to sociological imagination...",
      "highlights": [
        { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.1, "color": "#FACC15" }
      ]
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
- `lastOpened` is ISO 8601 UTC
- Never delete this file — it is the user's data

---

## Project Structure

```
slidenotes/
├── AGENT.md                      ← you are here
├── package.json
├── vite.config.js
├── tailwind.config.js
│
├── electron/
│   ├── main.js                   ← app lifecycle, ipcMain handlers, BrowserWindow
│   ├── preload.js                ← contextBridge — ONLY file that bridges main↔renderer
│   └── libreoffice.js            ← LibreOffice detection & headless conversion helper
│
├── src/
│   ├── main.jsx                  ← React entry point
│   ├── App.jsx                   ← root component, holds global state
│   │
│   ├── components/
│   │   ├── DropZone.jsx          ← empty state, drag-and-drop + file picker button
│   │   ├── ThumbnailBar.jsx      ← left sidebar, scrollable slide thumbnails
│   │   ├── SlideViewer.jsx       ← center panel, renders current slide via pdf.js
│   │   ├── HighlightOverlay.jsx  ← SVG canvas overlay for drawing highlights
│   │   └── NotesPanel.jsx        ← right panel, textarea + auto-save indicator
│   │
│   └── hooks/
│       ├── useNotes.js           ← load, save, debounced auto-save logic
│       ├── useSlides.js          ← slide navigation, page count, current index
│       └── useHighlights.js      ← highlight CRUD per slide
│
├── public/
│   └── pdf.worker.min.js         ← pdf.js worker (copy from pdfjs-dist)
│
└── dist/                         ← electron-builder output (git-ignored)
    └── mac/
        └── SlideNotes.app
```

---

## Coding Patterns

### State lives in App.jsx

Global state is managed in `App.jsx` and passed down as props or via Context.
Do not use Redux or Zustand for MVP — React state is sufficient.

```
App.jsx state:
  - filePath: string | null
  - pdfPath: string | null
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
// src/main.jsx or App.jsx — run once at startup
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
```

### LibreOffice detection order

Check in this order, stop at first found:

1. Bundled inside `.app` at `Resources/LibreOffice.app`
2. `/Applications/LibreOffice.app`
3. Show user a dialog: "LibreOffice is required. [Download]"

```js
// electron/libreoffice.js
function getLibreOfficePath() {
  const candidates = [
    path.join(process.resourcesPath, 'LibreOffice.app', 'Contents', 'MacOS', 'soffice'),
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}
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
| `company_id` from request (not relevant here) | N/A |
| Pixel-based highlight coords in JSON | Normalized 0–1 coords |
| Save notes only on window close | Auto-save debounced on keystroke |
| Hardcode LibreOffice path | Use detection function in `libreoffice.js` |
| Access `pdfPath` before conversion completes | Await `convertFile()` fully before rendering |
| Store slide index as 1-based in JSON | Always 0-based string keys |

---

## Key Result — What "Done" Looks Like

### MVP (Must Have)
- [ ] Open `.pptx` or `.pdf` via drag-drop or file picker
- [ ] Slides rendered correctly via pdf.js
- [ ] Prev/Next navigation + keyboard arrows
- [ ] Notes textarea per slide
- [ ] Auto-save to `.slidenotes.json` (debounced)
- [ ] Notes reload when same file is reopened
- [ ] App builds to `.app` via `npm run build`

### V1.1 (Should Have)
- [ ] Thumbnail sidebar with active slide highlight
- [ ] Highlight overlay — draw boxes on slide, stored in JSON
- [ ] Export notes as `.md` or `.txt`

### V1.2 (Nice to Have)
- [ ] Dark mode (follow macOS system preference)
- [ ] Zoom on slide (pinch or +/-)
- [ ] Full-text search across all slide notes

---

## Common Commands

```bash
# Development
npm install
npm run dev          # starts Vite + Electron in dev mode with hot reload

# Build
npm run build        # bundles React, then runs electron-builder → dist/mac/SlideNotes.app

# Lint
npm run lint

# electron-builder config is in package.json under "build" key
```

---

## Security Notes

- Never set `contextIsolation: false` — keep it `true` (Electron default)
- Never set `nodeIntegration: true` — always use preload script
- `preload.js` is the only file allowed to use `ipcRenderer` — not App.jsx, not hooks
- Do not load remote URLs in BrowserWindow — `loadFile()` only for local HTML

---

*Update this file when architecture decisions, IPC channels, or storage format changes.*
