# Changelog
## SlideNotes

All notable changes to this project will be documented in this file.
Format: [Semantic Versioning](https://semver.org) — MAJOR.MINOR.PATCH

---

## [1.2.0] — 2026-05 — Highlight & Export Options

### Added
- **Highlight box** — draw color-coded highlight boxes on slides (5 colors, 40% opacity)
- **Highlight notes** — attach a note to any highlight box via hover popup
- **Highlight dot indicator** — visual marker on highlight boxes that have notes
- **Highlights in PDF export** — highlight boxes visible in slide images; highlight notes listed in "Highlights:" section per page
- **Export layout options** — choose between 1-per-page, 2-per-page, or notes-only before exporting
- **Export modal** — layout picker with SVG preview before confirming export
- **Zoom on slide** — zoom in/out via toolbar buttons, pinch trackpad, or Cmd+=/-/0
- **Search notes** — Cmd+F to search across all slide notes and highlight notes

### Changed
- Export PDF now opens a modal instead of exporting immediately
- Layout preference saved and restored between sessions
- Slide capture includes highlight boxes drawn on canvas before export

---

## [1.1.0] — 2026-05 — Thumbnail & Polish

### Added
- **Thumbnail sidebar** — scrollable left panel with slide previews, click to navigate
- **Lazy thumbnail rendering** — IntersectionObserver for performance with large PDFs
- **Error states** — clear messages for PDF load failure, export failure, save failure
- **Auto-retry save** — failed saves retry once before showing error indicator
- **Title bar** — shows current filename in window title bar
- **Resize-safe layout** — panels adapt correctly on window resize

### Fixed
- Slide re-renders correctly on window resize
- Notes textarea scrolls instead of overflowing layout
- Special characters in filenames handled correctly via `path.parse` / `path.join`

---

## [1.0.0] — 2026-05 — MVP

### Added
- **Open PDF** — drag-and-drop or file picker (PDF only)
- **Slide rendering** — pdf.js renders each PDF page as a slide
- **Slide navigation** — Prev/Next buttons, keyboard arrow keys, slide counter
- **Notes panel** — per-slide textarea on the right side
- **Auto-save** — notes debounced-saved (800ms) to `.slidenotes.json` alongside PDF
- **Persistent notes** — notes reload automatically when the same PDF is reopened
- **Export PDF** — export all slides + notes as a single PDF (slide image + notes per page)
- **macOS app bundle** — distributed as `.app` via electron-builder (arm64 + x64)

### Technical
- Electron 30+ with React 18 + Vite + Tailwind CSS
- pdf.js for PDF rendering in renderer process
- pdf-lib for PDF export in main process
- IPC via contextBridge — renderer never accesses Node.js directly
- Notes stored as `.slidenotes.json` (0-based slide index, normalized highlight coords)

---

*This changelog is updated by the engineer at the end of each sprint before merging to main.*