# Changelog
## SlideNotes

All notable changes to this project will be documented in this file.
Format: [Semantic Versioning](https://semver.org) — MAJOR.MINOR.PATCH

---

## [1.5.0] — 2026-05 — Sprint 10

### Added
- Layout switcher: default 3-kolom ↔ zoom mode (top-bottom)
- Thumbnail overlay di zoom mode (hover reveal, scroll horizontal)
- Rich text notes editor (bold, italic, underline, bullet, numbered list)
- Highlight numbering system (auto-assign by position)
- Highlight Notes panel (zoom mode, kanan bawah)
- Auto-insert [N] marker saat highlight baru dibuat

### Fixed
- Minimum window size diturunkan ke 800×600 (side-by-side friendly)
- Highlight jump on first drag di zoom mode
- Badge nomor highlight tidak terlihat
- HL note edit langsung close
- HL note text overflow ke kanan
- PDF export text wrap dan dynamic height
- PDF notes sangat panjang → halaman overflow

---

## [1.4.1] — 2026-05 — Patch

### Fixed
- Pan clamp simetris — bisa pan ke semua arah saat zoom in
- 2 jari swipe trackpad → pan slide saat zoom > 100%
- Pinch zoom smooth via requestAnimationFrame
- Highlight resize jump on first drag

---

## [1.4.0] — 2026-05 — Bug Fixes & Home Screen

### Added
- **Home screen** — landing view with drop zone when no PDF is open
- **Recent files** — up to 10 recently opened PDFs in localStorage, sorted by last opened
- **Back to home** — `← Home` button in toolbar closes PDF and returns to home screen
- **Delete highlight via keyboard** — `Delete` or `Backspace` removes selected highlight (cursor tool only)

### Fixed
- **Slide fit on panel resize** — slide re-renders via `ResizeObserver` and scale-to-fit (width and height) when center panel changes size
- **Smooth panel divider drag** — pointer capture, `requestAnimationFrame` throttling, width calculated from container position

### Changed
- Notes are flushed to disk before navigating back to home (no confirmation dialog)
- Missing recent files show an error toast and are removed from the list
- `file-exists` IPC handler validates recent file paths before opening

---

## [1.3.1] — 2026-05 — Hotfix

### Fixed
- Production `.app` showing raw CSS as text — renderer now loads `dist/index.html` via `app.getAppPath()` and `file://` URL so relative asset paths resolve correctly

---

## [1.3.0] — 2026-05 — Interaction Polish

### Added
- **Cursor tool** — explicit select mode in highlight toolbar; default when opening a file
- **Persistent draw mode** — stay on the same highlight color after drawing; exit via Cursor tool or Esc
- **Move & resize highlights** — drag highlights to reposition; 8 resize handles on hover in cursor mode
- **Pan when zoomed in** — drag empty slide area to pan viewport when zoom > 100% (cursor tool only)
- **Draggable panel divider** — resize slide vs notes panel proportion; preference saved to localStorage

### Changed
- Highlight toolbar layout: `[Cursor] | [5 colors]` with visual separator
- Clicking active color no longer exits draw mode — use Cursor or Esc instead
- Notes panel width is dynamic (20–50%) instead of fixed 35%
- Slide scroll area uses overflow hidden when panning is enabled

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