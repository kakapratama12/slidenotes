# SlideNotes — Product Requirements Document
## Presentation Note-Taking App for macOS
**Version 1.1 | May 2026 | Confidential**

---

## 1. Project Overview

| Field | Value |
|---|---|
| Product Name | SlideNotes |
| Platform | macOS (desktop application) |
| Distribution | Local use only — distributed as a `.app` bundle |
| Runtime | Electron (Chromium + Node.js) |
| Data Storage | Local filesystem — no cloud, no account required |
| Version | 1.1 (MVP — PDF only) |

### 1.1 Problem Statement

Students and professionals who attend lectures or presentations often need to take notes alongside slide content. The current workflow requires switching between a PDF viewer and a separate notes app, breaking focus and making it hard to associate notes with specific slides.

SlideNotes solves this by letting users open a `.pdf` file, view each slide in a clean layout, and write notes directly alongside — with all notes saved automatically per slide and exportable as a PDF.

### 1.2 Target User

- University students reviewing lecture slides
- Professionals studying training materials or decks
- Anyone who wants to annotate presentations locally without cloud dependency

### 1.3 Key Decisions (Resolved)

| Decision | Choice | Reason |
|---|---|---|
| File format support | **PDF only** for MVP | Avoid LibreOffice dependency — user converts PPTX → PDF themselves via PowerPoint/Keynote |
| Notes storage location | **Alongside source file** | Intuitive — notes "follow" the PDF |
| Export format | **PDF** — slide image + notes per page | Most useful for sharing/reviewing |
| macOS signing | **Not required for v1** | Personal local use only |

### 1.4 Success Criteria

- User opens a `.pdf` file and sees slides rendered within 3 seconds
- Notes are auto-saved and persist between app sessions
- App launches via double-click — no terminal, no dependencies to install
- Export produces a clean PDF with each slide + its notes

---

## 2. Feature Requirements

| Feature | Description | Priority |
|---|---|---|
| File Open | Open a `.pdf` via drag-and-drop or file picker button | Must Have |
| Slide Rendering | Each PDF page rendered as a slide in the center panel | Must Have |
| Slide Navigation | Prev/Next buttons, slide counter (e.g. `3 / 12`), keyboard arrow keys | Must Have |
| Notes Panel | Right-side textarea, one note box per slide | Must Have |
| Auto-save | Notes saved on every keystroke (debounced) to `.slidenotes.json` | Must Have |
| Persistent Notes | Notes reload automatically when same PDF is reopened | Must Have |
| Export to PDF | Export all slides + notes as a single PDF (one slide per page) | Must Have |
| Slide Thumbnail Bar | Scrollable left sidebar with thumbnail previews, click to navigate | Should Have |
| Highlight on Slide | Draw highlight boxes on slide, stored in notes JSON | Should Have |
| Dark Mode | Follow macOS system dark/light mode preference | Nice to Have |
| Zoom on Slide | Pinch-to-zoom or +/- zoom on slide | Nice to Have |
| Search Notes | Full-text search across all slide notes | Nice to Have |

---

## 3. UX & Layout Specification

### 3.1 App Window

- Minimum window size: **1200 × 750px**
- Default window size on launch: **1400 × 900px**
- Window is resizable; panels adapt proportionally

### 3.2 Layout — Three-Column

```
┌──────────────┬───────────────────────────────┬──────────────────────┐
│  Thumbnail   │         Slide Viewer           │    Notes Panel       │
│  Sidebar     │                                │                      │
│  ~220px      │         ~55% width             │     ~35% width       │
│              │                                │                      │
│  [Slide 1]   │   ┌─────────────────────┐     │  Notes — Slide 3     │
│  [Slide 2]   │   │                     │     │  ┌────────────────┐  │
│ ▶[Slide 3]   │   │    Slide Image      │     │  │                │  │
│  [Slide 4]   │   │                     │     │  │  textarea...   │  │
│  [Slide 5]   │   └─────────────────────┘     │  │                │  │
│  ...         │        ◀  3 / 12  ▶           │  └────────────────┘  │
│              │                                │  ✓ Saved             │
└──────────────┴───────────────────────────────┴──────────────────────┘
```

| Panel | Width | Content |
|---|---|---|
| Left Sidebar | ~220px | Scrollable slide thumbnails. Active slide highlighted. Click to navigate. |
| Center Panel | ~55% | Current slide rendered via pdf.js. Prev/Next controls + slide counter below. |
| Right Panel | ~35% | Notes textarea for current slide. Label: "Notes — Slide 3". Auto-save indicator at bottom. |

### 3.3 Empty State (No File Loaded)

- Full window shows a centered drag-and-drop zone
- Text: *"Drop a PDF file here, or click to browse"*
- Three-column layout only appears after a file is loaded

### 3.4 Navigation

- **Keyboard:** Left/Right arrow keys navigate slides
- **Sidebar:** Click any thumbnail
- **Buttons:** Prev / Next below slide view

### 3.5 Export PDF Layout

Each page of the exported PDF contains:
```
┌──────────────────────────────────┐
│  [Slide image — top 60%]         │
├──────────────────────────────────┤
│  Notes:                          │
│  "note text here..."             │
│                                  │
└──────────────────────────────────┘
   Slide 3 / 12 · SlideNotes
```

- Slides with no notes still appear (notes section shows empty)
- Footer: slide number + app name
- One slide per page

---

## 4. Technical Specification

### 4.1 Technology Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 30+ |
| Frontend Framework | React 18 (bundled via Vite) |
| Styling | Tailwind CSS |
| PDF rendering | pdf.js (Mozilla) — renders PDF pages as canvas in renderer |
| Notes persistence | `.slidenotes.json` via Node.js `fs` (main process via IPC) |
| PDF export | `pdf-lib` — composites slide images + notes text |
| IPC | Electron `contextBridge` + `ipcMain` / `ipcRenderer` |
| Packaging | electron-builder → `.app` for macOS (arm64 + x64) |

**No external dependencies required from user.** Node.js is bundled by Electron.

### 4.2 Notes Storage Format

Notes saved as JSON file alongside the source PDF:

```
~/Documents/lecture.pdf  →  ~/Documents/lecture.slidenotes.json
```

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

- Slide index is **0-based string key**
- User never needs to open or know about this file
- `highlights` array reserved for Should Have milestone (default empty array)

### 4.3 IPC API Contract

All file system access goes through main process via IPC. Renderer uses `window.electronAPI.*` only.

| Channel | Input | Output |
|---|---|---|
| `open-file-dialog` | — | `string \| null` (file path) |
| `load-notes` | `filePath: string` | `NotesFile \| null` |
| `save-notes` | `{ filePath, notes }` | `{ ok: boolean }` |
| `export-pdf` | `{ filePath, slideImages, notes }` | `{ ok: boolean, exportPath: string }` |

### 4.4 Export PDF Pipeline

```
User clicks Export
  → Renderer captures each slide as base64 PNG from canvas
  → Sends slideImages[] + notes via IPC to main process
  → Main process uses pdf-lib to compose pages
  → Each page: slide image (top 60%) + notes text (bottom 40%)
  → Saves as lecture-notes.pdf in same folder as source
  → Shows success notification with file path
```

---

## 5. Project Structure

```
slidenotes/
├── AGENT.md
├── PRD.md
├── package.json
├── vite.config.js
├── tailwind.config.js
│
├── electron/
│   ├── main.js           # app lifecycle, ipcMain handlers
│   ├── preload.js        # contextBridge — only IPC bridge
│   └── exporter.js       # pdf-lib export logic
│
├── src/
│   ├── main.jsx          # React entry point, pdf.js worker init
│   ├── App.jsx           # root component, global state
│   ├── components/
│   │   ├── DropZone.jsx
│   │   ├── ThumbnailBar.jsx
│   │   ├── SlideViewer.jsx
│   │   ├── HighlightOverlay.jsx  # Should Have
│   │   └── NotesPanel.jsx
│   └── hooks/
│       ├── useNotes.js
│       └── useSlides.js
│
├── public/
│   └── pdf.worker.min.js
└── dist/                 # electron-builder output (git-ignored)
```

---

## 6. Build & Distribution

### 6.1 Development Setup (One Time)

Requirements: Node.js 20+

```bash
npm install
npm run dev        # Electron + Vite dev mode with hot reload
```

### 6.2 Production Build

```bash
npm run build      # → dist/mac/SlideNotes.app
```

Move `SlideNotes.app` to Applications folder. Double-click to open. Done.

### 6.3 First Launch on macOS

macOS may show "unidentified developer" warning on first launch.
User: right-click the `.app` → Open → Open anyway. One-time only.

---

## 7. Sprint Plan

| Sprint | ID | Task | Deliverable | Est. |
|---|---|---|---|---|
| S1 | S1-01 | Project scaffold | Electron + React + Vite + Tailwind running, window opens | 0.5d |
| S1 | S1-02 | IPC bridge | preload.js + all ipcMain handlers stubbed + tested | 0.5d |
| S2 | S2-01 | File open | Drag-drop + file picker, PDF path in app state | 0.5d |
| S2 | S2-02 | Slide rendering | pdf.js renders pages, Prev/Next + counter working | 1d |
| S2 | S2-03 | Thumbnail sidebar | Scrollable thumbnails, click to navigate, active highlight | 1d |
| S3 | S3-01 | Notes panel | Textarea per slide, debounced auto-save to JSON | 1d |
| S3 | S3-02 | Persistent notes | Load existing `.slidenotes.json` on file open | 0.5d |
| S3 | S3-03 | Export PDF | Slide images + notes composed and saved as PDF | 1d |
| S4 | S4-01 | Polish & styling | Consistent UI, empty states, error handling | 1d |
| S4 | S4-02 | Build & package | electron-builder config, `.app` output verified | 0.5d |

**MVP = S1 + S2 + S3 (~6–7 days total)**

---

## 8. Out of Scope (v1)

- PPTX file support (user converts to PDF themselves via PowerPoint/Keynote)
- Cloud sync or multi-device access
- Collaboration or sharing
- Windows or Linux support
- Rich text formatting in notes
- Audio/video recording

---

*SlideNotes — v1.1 PRD | May 2026*
