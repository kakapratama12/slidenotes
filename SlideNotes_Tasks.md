# SlideNotes_Tasks.md
## Task List for AI Agent Engineer

Status legend: ⬜ not started · 🔄 in progress · ✅ done

---

## Initial Agent Prompt

Paste this once at the start of every new agent session:

```
Kamu adalah engineer untuk project SlideNotes — macOS desktop app untuk note-taking saat baca PDF slide.

Sebelum mulai apapun, baca file-file ini secara berurutan:
1. AGENT.md
2. PRD.md
3. SlideNotes_Tasks.md (lihat task yang belum ✅ — kerjakan dari atas)

Konfirmasi pemahaman sebelum mulai task apapun.
Jangan tulis satu baris code pun sebelum konfirmasi.
```
---

## Definition of Done (berlaku untuk SETIAP task)

Sebelum merge dan lapor ke PM, pastikan semua checklist ini terpenuhi:

**Git**
- [ ] Branch dibuat dari `develop` dengan nama yang benar (`feature/SX-XX-nama`)
- [ ] Semua perubahan di-commit dengan pesan yang sesuai spec task
- [ ] Branch di-push dan di-merge ke `develop`

**ADR**
- [ ] Periksa: apakah ada keputusan teknis yang tidak ada di spec awal (PRD.md / AGENT.md)?
- [ ] Jika ya → tambahkan ADR baru di `ADR.md` dengan format yang sudah ada
- [ ] Jika AGENT.md perlu diupdate (IPC channel baru, pattern baru, dll) → update sekalian
- [ ] Commit perubahan doc: `"docs: update ADR and AGENT for SX-XX"`

**Verify**
- [ ] Semua verify checklist di task sudah dijalankan manual
- [ ] Tidak ada error baru di console

**Laporan**
- [ ] Laporan ke PM mencakup: apa yang dibuat, hasil verify, ADR baru (jika ada)
- [ ] Sebutkan task berikutnya yang siap dikerjakan

**Akhir Sprint (hanya saat semua task sprint selesai)**
- [ ] Merge `develop` → `main` dan push
- [ ] Update `CHANGELOG.md` — tambahkan versi baru dengan semua perubahan sprint ini
- [ ] Update versi di `package.json` (MAJOR.MINOR.PATCH)
- [ ] Buat GitHub Release:
  - Tag: `v1.x.0` sesuai versi
  - Title: `SlideNotes v1.x.0`
  - Body: copy dari CHANGELOG.md versi ini
  - Upload: `release/SlideNotes-x.x.x-arm64.dmg` dan `release/SlideNotes-x.x.x.dmg`
- [ ] Commit: `"chore: bump version to 1.x.0 and update CHANGELOG"`

---

## Sprint 1 — Foundation

### ⬜ S1-01: Project Scaffold

Buat branch baru dulu:
```
git checkout -b feature/S1-01-scaffold
```

**Scope:**

Setup project Electron + React + Vite + Tailwind dari awal:

1. `package.json` dengan dependencies:
   - `electron` (latest stable)
   - `react`, `react-dom` (18+)
   - `vite`, `@vitejs/plugin-react`
   - `tailwindcss`, `autoprefixer`, `postcss`
   - `electron-builder` (devDependency)
   - `pdfjs-dist`
   - `pdf-lib`

2. `vite.config.js` — configured for Electron renderer (base: `./`)

3. `tailwind.config.js` — scan `src/**/*.{js,jsx}`

4. `electron/main.js`:
   - Buka BrowserWindow (1400×900, min 1200×750)
   - `contextIsolation: true`, `nodeIntegration: false`
   - Load `index.html` via `loadFile`
   - Handle `app.whenReady()` dan `window-all-closed`

5. `electron/preload.js`:
   - Skeleton file dengan comment placeholder untuk IPC channels
   - Belum ada `exposeInMainWorld` — itu di S1-02

6. `src/main.jsx` — React entry point, render `<App />`

7. `src/App.jsx` — kosong, hanya return `<div>SlideNotes</div>`

8. `public/` — copy `pdf.worker.min.js` dari `pdfjs-dist/build/`

9. `package.json` scripts:
   ```json
   "dev": "concurrently \"vite\" \"electron .\"",
   "build": "vite build && electron-builder"
   ```

**Verify:**
- `npm run dev` → window Electron terbuka, tampil teks "SlideNotes"
- Tidak ada error di console
- Tailwind CSS loaded (cek dengan tambah class sementara `className="text-red-500"`)

**Setelah selesai:**
Commit: `"feat(S1-01): scaffold Electron + React + Vite + Tailwind"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S1-02: IPC Bridge

Buat branch baru:
```
git checkout -b feature/S1-02-ipc-bridge
```

**Scope:**

Setup lengkap IPC antara main dan renderer. Semua channel di-stub dulu (belum implementasi penuh).

1. `electron/preload.js` — expose semua channels via `contextBridge`:

```js
contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  loadNotes: (filePath) => ipcRenderer.invoke('load-notes', filePath),
  saveNotes: (filePath, notes) => ipcRenderer.invoke('save-notes', { filePath, notes }),
  exportPdf: (filePath, slideImages, notes) => ipcRenderer.invoke('export-pdf', { filePath, slideImages, notes }),
});
```

2. `electron/main.js` — tambah semua `ipcMain.handle`:
   - `open-file-dialog` → gunakan `dialog.showOpenDialog`, filter `.pdf` only
   - `load-notes` → stub, return `null` untuk sekarang
   - `save-notes` → stub, return `{ ok: true }`
   - `export-pdf` → stub, return `{ ok: true, exportPath: '' }`

3. `src/App.jsx` — tambah test button sementara:
   ```jsx
   <button onClick={() => window.electronAPI.openFileDialog().then(console.log)}>
     Test Open Dialog
   </button>
   ```

**Verify:**
- Klik tombol test → native macOS file picker terbuka
- Picker hanya menampilkan file `.pdf`
- Setelah pilih file, path-nya muncul di console
- Tidak ada error "electronAPI is not defined"
- Tidak ada error `contextBridge` di console

**Setelah selesai:**
Hapus test button dari `App.jsx`.
Commit: `"feat(S1-02): setup IPC bridge with stubbed handlers"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

## Sprint 2 — Slide Viewing

### ⬜ S2-01: File Open & State

Buat branch baru:
```
git checkout -b feature/S2-01-file-open
```

**Scope:**

1. `src/components/DropZone.jsx`:
   - Tampil saat belum ada file terbuka
   - Area drag-and-drop di tengah layar
   - Teks: "Drop a PDF file here, or click to browse"
   - Klik → panggil `window.electronAPI.openFileDialog()`
   - Drag-and-drop: handle `onDragOver` + `onDrop`, extract file path dari event
   - Validasi: hanya terima `.pdf`, tampilkan error kecil jika bukan PDF

2. `src/App.jsx` — global state:
   ```js
   const [filePath, setFilePath] = useState(null);
   const [pageCount, setPageCount] = useState(0);
   const [currentIndex, setCurrentIndex] = useState(0);
   const [notes, setNotes] = useState({});
   const [saveStatus, setSaveStatus] = useState('saved');
   ```
   - Render `<DropZone />` jika `filePath === null`
   - Render three-column layout jika `filePath` ada (layout bisa kosong dulu)

**Verify:**
- Buka app → tampil DropZone
- Klik → file picker terbuka, hanya PDF terlihat
- Pilih PDF → `filePath` tersimpan di state, DropZone hilang
- Drag file `.pdf` ke app → sama, berhasil
- Drag file `.docx` → tidak masuk, tampil pesan error kecil

**Setelah selesai:**
Commit: `"feat(S2-01): file open via picker and drag-drop"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S2-02: Slide Rendering & Navigation

Buat branch baru:
```
git checkout -b feature/S2-02-slide-rendering
```

**Scope:**

1. `src/main.jsx` — init pdf.js worker sekali saat startup:
   ```js
   import * as pdfjsLib from 'pdfjs-dist';
   pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
   ```

2. `src/hooks/useSlides.js`:
   - Menerima `filePath`
   - Load PDF via `pdfjsLib.getDocument(filePath)`
   - Expose: `pageCount`, `currentIndex`, `goNext()`, `goPrev()`, `goTo(index)`, `renderPage(index, canvasRef)`
   - `renderPage` render halaman PDF ke canvas element

3. `src/components/SlideViewer.jsx`:
   - Center panel
   - `<canvas ref={canvasRef} />` — slide dirender di sini
   - Tombol Prev / Next di bawah
   - Slide counter: `3 / 12`
   - Keyboard listener: `ArrowLeft` → goPrev, `ArrowRight` → goNext
   - Loading state saat render berlangsung

4. `src/App.jsx`:
   - Gunakan `useSlides(filePath)`
   - Render `<SlideViewer />` di center panel
   - Three-column layout dengan placeholder kiri dan kanan

**Verify:**
- Buka PDF → slide pertama muncul di canvas
- Klik Next → slide berikutnya muncul, counter update
- Klik Prev → kembali, tidak bisa kurang dari slide 1
- Tekan `→` dan `←` → navigasi via keyboard
- Counter menampilkan `1 / [total]` yang benar
- Slide terakhir → Next disabled atau tidak melanjutkan

**Setelah selesai:**
Commit: `"feat(S2-02): PDF rendering and slide navigation"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S2-03: Thumbnail Sidebar

Buat branch baru:
```
git checkout -b feature/S2-03-thumbnails
```

**Scope:**

1. `src/components/ThumbnailBar.jsx`:
   - Left sidebar, lebar ~220px, scrollable vertikal
   - Render thumbnail kecil untuk setiap slide
   - Thumbnail dirender via pdf.js ke canvas kecil (scale kecil, misalnya 0.2)
   - Slide aktif: border highlight (warna accent)
   - Klik thumbnail → navigasi ke slide tersebut
   - Label nomor slide di bawah tiap thumbnail

2. Performance note: render thumbnail secara lazy — prioritaskan slide yang visible di viewport sidebar, bukan semua sekaligus.

**Verify:**
- Sidebar muncul di kiri dengan semua slide sebagai thumbnail
- Scroll sidebar jika slide banyak
- Slide aktif punya highlight border
- Klik thumbnail → center panel pindah ke slide tersebut
- Navigasi via Prev/Next → highlight thumbnail ikut pindah

**Setelah selesai:**
Commit: `"feat(S2-03): thumbnail sidebar with active highlight"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

## Sprint 3 — Notes & Export

### ⬜ S3-01: Notes Panel & Auto-save

Buat branch baru:
```
git checkout -b feature/S3-01-notes-panel
```

**Scope:**

1. `src/hooks/useNotes.js`:
   - State: `notes` — object `{ "0": { note: "", highlights: [] }, ... }`
   - `updateNote(slideIndex, text)` — update note untuk slide tertentu
   - `saveDebounced` — debounce 800ms, panggil `window.electronAPI.saveNotes(filePath, notes)`
   - `setSaveStatus` — set `'saving'` saat mulai, `'saved'` setelah berhasil, `'error'` jika gagal

2. `src/components/NotesPanel.jsx`:
   - Right panel, lebar ~35%
   - Label di atas: "Notes — Slide {currentIndex + 1}"
   - `<textarea>` full height, placeholder: "Type your notes here..."
   - Value dari `notes[currentIndex]?.note ?? ''`
   - `onChange` → panggil `updateNote(currentIndex, value)`
   - Status indicator di bawah:
     - `✓ Saved` (hijau) saat saved
     - `Saving...` (abu) saat saving
     - `⚠ Save failed` (merah) saat error

3. `electron/main.js` — implementasi `save-notes` handler:
   - Terima `{ filePath, notes }`
   - Hitung path JSON: ganti extension dengan `.slidenotes.json`
   - `fs.writeFileSync(jsonPath, JSON.stringify(notes, null, 2))`
   - Return `{ ok: true }` atau `{ ok: false }` jika error

**Verify:**
- Buka PDF → notes panel muncul di kanan
- Ketik di notes → setelah 800ms, file `.slidenotes.json` terbuat di folder yang sama dengan PDF
- Pindah ke slide lain → textarea kosong / menampilkan note slide tersebut
- Kembali ke slide sebelumnya → note tetap ada
- Status indicator berubah saat saving

**Setelah selesai:**
Commit: `"feat(S3-01): notes panel with debounced auto-save"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S3-02: Persistent Notes

Buat branch baru:
```
git checkout -b feature/S3-02-persistent-notes
```

**Scope:**

1. `electron/main.js` — implementasi `load-notes` handler:
   - Terima `filePath`
   - Hitung path JSON dari filePath
   - Jika file ada: `JSON.parse(fs.readFileSync(jsonPath))`
   - Jika tidak ada: return `null`
   - Jika file corrupt (JSON parse error): return `null`, log warning

2. `src/App.jsx` — saat `filePath` di-set:
   - Panggil `window.electronAPI.loadNotes(filePath)`
   - Jika ada data → hydrate `notes` state dengan data dari file
   - Jika `null` → mulai dengan notes kosong

**Verify:**
- Buka PDF, ketik notes di beberapa slide, tunggu auto-save
- Tutup app
- Buka app lagi, buka PDF yang sama → semua notes muncul kembali
- Buka PDF berbeda yang belum punya notes → mulai kosong, tidak error
- Buka PDF dengan file `.slidenotes.json` yang corrupt → mulai kosong, tidak crash

**Setelah selesai:**
Commit: `"feat(S3-02): load persistent notes on file open"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S3-03: Export PDF

Buat branch baru:
```
git checkout -b feature/S3-03-export-pdf
```

**Scope:**

1. `src/components/SlideViewer.jsx` — tambah method `captureSlide(index)`:
   - Render slide ke canvas
   - Return canvas sebagai base64 PNG: `canvas.toDataURL('image/png')`

2. `src/App.jsx` — tambah tombol "Export PDF":
   - Letakkan di toolbar atas atau di atas notes panel
   - Saat diklik:
     1. Tampilkan loading state "Exporting..."
     2. Loop semua slide, capture base64 image tiap slide
     3. Kumpulkan notes dari state
     4. Panggil `window.electronAPI.exportPdf(filePath, slideImages, notes)`
     5. Tampilkan sukses: "Saved to [exportPath]" atau error jika gagal

3. `electron/exporter.js` — logika export dengan `pdf-lib`:
   ```
   Untuk setiap slide:
     - Buat halaman PDF ukuran A4 landscape
     - Embed slide image di top 60% halaman
     - Tulis teks notes di bottom 40%
     - Tulis footer: "Slide X / Y · SlideNotes"
   ```
   - Simpan output sebagai `lecture-notes.pdf` di folder yang sama dengan source

4. `electron/main.js` — implementasi `export-pdf` handler:
   - Panggil `exporter.js`
   - Return `{ ok: true, exportPath }` atau `{ ok: false, error }`

**Verify:**
- Buka PDF dengan beberapa notes
- Klik Export PDF → loading muncul
- File `[nama]-notes.pdf` terbuat di folder yang sama
- Buka file hasil export → setiap halaman punya slide image + notes di bawah
- Slide tanpa notes → halaman tetap ada, bagian notes kosong
- Footer menampilkan nomor slide yang benar

**Setelah selesai:**
Commit: `"feat(S3-03): export slides and notes as PDF"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

## Sprint 4 — Polish & Build

### ⬜ S4-01: Polish & Error Handling

Buat branch baru:
```
git checkout -b feature/S4-01-polish
```

**Scope:**

1. **Consistent styling** — pastikan semua komponen konsisten:
   - Font, spacing, warna mengikuti Tailwind config
   - Tidak ada layout yang patah saat window di-resize

2. **Error states:**
   - PDF gagal load → pesan error + tombol "Try another file"
   - Export gagal → toast/notifikasi error
   - Notes gagal save → indikator merah, retry otomatis sekali

3. **Edge cases:**
   - PDF dengan 1 halaman → Prev/Next disabled
   - Notes terlalu panjang → textarea scrollable, tidak overflow layout
   - Nama file dengan karakter khusus → tidak crash saat buat `.slidenotes.json`

4. **App title bar:** tampilkan nama file yang sedang dibuka di title bar window:
   ```js
   mainWindow.setTitle(`SlideNotes — lecture.pdf`);
   ```

**Verify:**
- Resize window ke berbagai ukuran → layout tidak patah
- Buka PDF yang corrupt → error message muncul, tidak crash
- Semua error state tampil dengan benar

**Setelah selesai:**
Commit: `"feat(S4-01): polish UI and add error handling"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S4-02: Build & Package

Buat branch baru:
```
git checkout -b feature/S4-02-build
```

**Scope:**

1. `package.json` — electron-builder config:
   ```json
   "build": {
     "appId": "com.slidenotes.app",
     "productName": "SlideNotes",
     "mac": {
       "target": ["dmg", "zip"],
       "arch": ["arm64", "x64"]
     },
     "files": ["dist/**/*", "electron/**/*", "public/**/*"],
     "directories": {
       "output": "release"
     }
   }
   ```

2. Jalankan `npm run build` → pastikan berhasil tanpa error

3. Test `.app` yang dihasilkan:
   - Double-click → app terbuka tanpa terminal
   - Semua fitur berfungsi di production build
   - Tidak ada "development only" warning

**Verify:**
- `npm run build` selesai tanpa error
- `release/mac/SlideNotes.app` terbentuk
- Double-click app → terbuka normal
- Buka PDF → semua fitur berjalan
- Tutup terminal setelah build → app tetap bisa dibuka

**Setelah selesai:**
Commit: `"feat(S4-02): electron-builder config and production build"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

## Checklist MVP

- [ ] S1-01 Project scaffold
- [ ] S1-02 IPC bridge
- [ ] S2-01 File open
- [ ] S2-02 Slide rendering
- [ ] S2-03 Thumbnail sidebar
- [ ] S3-01 Notes panel + auto-save
- [ ] S3-02 Persistent notes
- [ ] S3-03 Export PDF
- [ ] S4-01 Polish
- [ ] S4-02 Build

---

*Update status task (⬜ → ✅) setiap kali task selesai dan di-merge ke develop.*

---

## Sprint 5 — Zoom & Search

### ⬜ S5-01: Zoom on Slide

Buat branch baru:
```
git checkout -b feature/S5-01-zoom
```

**Scope:**

1. `src/hooks/useSlides.js` — tambah zoom state:
   - `zoom: number` — default `1.0`, min `0.5`, max `3.0`
   - `zoomIn()` — tambah 0.25
   - `zoomOut()` — kurangi 0.25
   - `zoomReset()` — kembali ke 1.0

2. `src/components/SlideViewer.jsx` — apply zoom:
   - Canvas container dibungkus div dengan `overflow-auto`
   - Canvas di-scale via `transform: scale(zoom)` dengan `transform-origin: top left`
   - Pinch-to-zoom via `wheel` event dengan `ctrlKey` (macOS trackpad standard)
   - Toolbar zoom: tombol `−` · `100%` (klik untuk reset) · `+`
   - Keyboard: `Cmd+=` zoom in, `Cmd+-` zoom out, `Cmd+0` reset

3. Zoom state di-reset ke `1.0` saat pindah slide

**Verify:**
- Klik `+` / `−` → slide membesar/mengecil
- Pinch trackpad → zoom mengikuti
- Klik persentase → reset ke 100%
- `Cmd+=`, `Cmd+-`, `Cmd+0` → keyboard shortcut berfungsi
- Pindah slide → zoom reset ke 100%
- Zoom tidak mempengaruhi export PDF (export selalu 100%)

**Setelah selesai:**
Commit: `"feat(S5-01): zoom on slide with trackpad and keyboard support"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S5-02: Search Notes

Buat branch baru:
```
git checkout -b feature/S5-02-search
```

**Scope:**

Search mencakup **slide notes** dan **highlight notes** sekaligus.

1. `src/components/SearchPanel.jsx` — panel search:
   - Input field dengan icon search
   - Tampil sebagai overlay panel (slide dari kanan atau atas, bukan replace layout)
   - Shortcut buka/tutup: `Cmd+F`
   - Tombol `✕` untuk tutup

2. Search logic (di `SearchPanel.jsx` atau `useSearch.js`):
   - Search dijalankan saat user berhenti ketik (debounce 300ms)
   - Scope: `notes[i].note` + semua `notes[i].highlights[j].note`
   - Return list hasil: `{ slideIndex, type: 'slide'|'highlight', excerpt, highlightId? }`
   - Excerpt: teks sekitar keyword, max 80 karakter, keyword di-bold

3. Search results:
   - List hasil di dalam SearchPanel
   - Tiap hasil: nomor slide + excerpt + label `Slide Note` atau `Highlight`
   - Klik hasil → navigasi ke slide tersebut, tutup panel
   - Jika hasil = 0 → tampil "No results for '...'"
   - Jika query kosong → tampil "Type to search your notes"

4. `src/App.jsx` — integrasi:
   - State `searchOpen: boolean`
   - `Cmd+F` toggle SearchPanel
   - Pass `notes` ke SearchPanel untuk search

**Verify:**
- `Cmd+F` → search panel terbuka
- Ketik keyword yang ada di slide note → hasil muncul
- Ketik keyword yang ada di highlight note → hasil muncul juga
- Klik hasil → navigasi ke slide yang benar
- Ketik keyword yang tidak ada → "No results"
- `Cmd+F` atau `✕` → panel tertutup

**Setelah selesai:**
Commit: `"feat(S5-02): search across slide notes and highlight notes"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

## Sprint 6 — Highlight Annotation

### ⬜ S6-01: Draw Highlight Box

Buat branch baru:
```
git checkout -b feature/S6-01-highlight-draw
```

**Scope:**

5 warna tersedia dengan opacity 40%:
- 🟡 Kuning `#FDE047` · 🟢 Hijau `#86EFAC` · 🔴 Merah `#FCA5A5` · 🔵 Biru `#93C5FD` · 🟣 Ungu `#C4B5FD`

1. `src/components/HighlightOverlay.jsx` — SVG overlay di atas slide canvas:
   - Absolute positioned, sama ukuran dengan canvas
   - Mode default: `view` — klik highlight untuk select
   - Mode draw: aktif saat warna dipilih di toolbar
   - Drag di atas slide → gambar kotak sementara
   - Mouse up → kotak tersimpan dengan warna aktif
   - Koordinat disimpan sebagai normalized 0–1 (lihat AGENT.md)
   - Render semua highlight dari `notes[currentIndex].highlights`

2. `src/components/HighlightToolbar.jsx` — toolbar pilih warna:
   - 5 circle warna, klik untuk aktifkan mode draw
   - Warna aktif: border putih + shadow
   - Klik warna yang sudah aktif → kembali ke mode view
   - Letakkan di bawah slide viewer, di atas tombol Prev/Next

3. `src/hooks/useNotes.js` — tambah:
   - `addHighlight(slideIndex, highlight)` — tambah ke array highlights
   - `deleteHighlight(slideIndex, highlightId)` — hapus by id
   - Setiap highlight punya `id` unik (nanoid atau crypto.randomUUID())

4. `src/App.jsx` — integrasi toolbar + overlay

**Verify:**
- Klik warna di toolbar → mode draw aktif (cursor crosshair)
- Drag di slide → kotak muncul dengan warna yang dipilih dan opacity 40%
- Mouse up → kotak tersimpan, muncul di slide
- Tutup app, buka lagi → highlight masih ada (tersimpan di JSON)
- Pindah slide → highlight slide tersebut tampil, slide lain tidak
- Klik warna aktif → kembali mode view, tidak bisa draw

**Setelah selesai:**
Commit: `"feat(S6-01): highlight box drawing with color selection"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S6-02: Highlight Note (Popup + Input)

Buat branch baru:
```
git checkout -b feature/S6-02-highlight-note
```

**Scope:**

1. Update struktur highlight di JSON (tambah field `note`):
   ```json
   {
     "id": "abc123",
     "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.1,
     "color": "#FDE047",
     "note": ""
   }
   ```

2. `src/components/HighlightPopup.jsx` — popup per highlight:
   - Muncul saat hover highlight box (delay 200ms biar tidak flicker)
   - Posisi: di atas atau bawah kotak (auto, sesuai ruang layar)
   - Konten:
     - Textarea kecil untuk note highlight (placeholder: "Add a note...")
     - Auto-save saat ketik (debounce 800ms, sama seperti slide notes)
     - Tombol `🗑` untuk hapus highlight
   - Tutup saat mouse leave popup + highlight (delay 300ms)

3. Visual indicator di highlight box:
   - Jika highlight punya note → tampil dot kecil di pojok kanan atas kotak
   - Warna dot: putih dengan border warna highlight

4. `src/hooks/useNotes.js` — tambah:
   - `updateHighlightNote(slideIndex, highlightId, note)` — update note highlight tertentu

**Verify:**
- Hover highlight → popup muncul setelah 200ms
- Ketik note di popup → auto-save, tersimpan di JSON
- Highlight dengan note → ada dot indikator di pojok
- Hover highlight lain → popup pindah ke highlight tersebut
- Klik `🗑` → highlight + note-nya dihapus
- Reload app → highlight note masih ada

**Setelah selesai:**
Commit: `"feat(S6-02): highlight popup with note input and delete"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S6-03: Highlight di Export PDF

Buat branch baru:
```
git checkout -b feature/S6-03-highlight-export
```

**Scope:**

Update `electron/exporter.js` — tiap halaman PDF sekarang:

```
┌──────────────────────────────────┐
│  [Slide image dengan kotak       │
│   highlight yang terlihat]       │
├──────────────────────────────────┤
│  Notes:                          │
│  "catatan slide secara umum..."  │
│                                  │
│  Highlights:                     │
│  🟡 "Ini poin penting soal Mills"│
│  🔵 "Perlu dicek lagi"           │
└──────────────────────────────────┘
   Slide X / Y · SlideNotes
```

1. `src/hooks/useSlides.js` — `captureSlide()`:
   - Sebelum capture canvas, gambar semua highlight box di atas slide
   - Gunakan `CanvasRenderingContext2D.fillRect()` dengan warna + opacity yang sama
   - Hasil capture sudah include highlight boxes

2. `electron/exporter.js` — update layout per halaman:
   - Jika slide punya highlights dengan note → tambahkan section "Highlights:" di bawah slide notes
   - Tiap highlight note: bullet dengan warna dot (kotak kecil warna) + teks note
   - Highlights tanpa note → tidak ditampilkan di section ini (sudah keliatan di gambar)
   - Jika slide tidak punya highlight note → section "Highlights:" tidak muncul

3. Hitung tinggi konten secara dinamis:
   - Jika banyak highlights → slide image diperkecil proporsional agar semua muat
   - Min tinggi slide image: 50% halaman

**Verify:**
- Buka PDF, buat beberapa highlight dengan note dan tanpa note
- Export PDF → buka hasil
- Gambar slide menampilkan kotak highlight
- Section "Highlights:" muncul hanya untuk slide yang punya highlight dengan note
- Highlight tanpa note tidak muncul di section teks, tapi keliatan di gambar
- Layout tidak overflow halaman meski banyak highlights

**Setelah selesai:**
Commit: `"feat(S6-03): render highlights and highlight notes in PDF export"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

## Sprint 7 — Export Options

### ⬜ S7-01: Opsi Layout Export PDF

Buat branch baru:
```
git checkout -b feature/S7-01-export-options
```

**Scope:**

3 opsi layout export, user pilih sebelum export:

| Layout | Deskripsi |
|---|---|
| `1-per-page` | 1 slide per halaman (default, sekarang) |
| `2-per-page` | 2 slide per halaman, notes di bawah masing-masing |
| `notes-only` | Hanya teks — nomor slide + slide note + highlight notes, tanpa gambar |

1. `src/components/ExportModal.jsx` — modal sebelum export:
   - Muncul saat klik "Export PDF" (ganti dari langsung export)
   - Pilihan layout: 3 radio button dengan preview ilustrasi kecil (SVG sederhana)
   - Tombol `Export` dan `Cancel`
   - Simpan preferensi terakhir ke localStorage

2. `electron/exporter.js` — tambah mode:
   - `exportPdf(options)` — terima `{ layout: '1-per-page'|'2-per-page'|'notes-only' }`
   - `layout: '2-per-page'` — dua slide per halaman landscape A4, notes di bawah tiap slide
   - `layout: 'notes-only'` — halaman portrait A4, teks saja, font readable, per slide dipisah garis

3. IPC `export-pdf` — update payload:
   - Tambah `layout` ke input: `{ filePath, slideImages, notes, layout }`

**Verify:**
- Klik Export PDF → modal muncul
- Pilih `1-per-page` → export seperti sebelumnya
- Pilih `2-per-page` → 2 slide per halaman di hasil PDF
- Pilih `notes-only` → PDF berisi teks saja, tidak ada gambar slide
- Preferensi layout tersimpan, saat buka modal lagi pilihan terakhir aktif
- Cancel → tidak ada file yang dibuat

**Setelah selesai:**
Commit: `"feat(S7-01): export layout options (1-per-page, 2-per-page, notes-only)"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

## Checklist v1.1

- [ ] S5-01 Zoom on slide
- [ ] S5-02 Search notes
- [ ] S6-01 Draw highlight box
- [ ] S6-02 Highlight note popup
- [ ] S6-03 Highlight di export PDF
- [ ] S7-01 Opsi layout export

---

*Update status task (⬜ → ✅) setiap kali task selesai dan di-merge ke develop.*

---

## Sprint 8 — Interaction Polish

### ✅ S8-01: Toolbar Redesign & Draw Mode Behaviour

Buat branch baru:
```
git checkout -b feature/S8-01-toolbar-redesign
```

**Scope:**

1. `src/components/HighlightToolbar.jsx` — redesign toolbar:
   - Tambah **Cursor tool** button di kiri (icon: `↖` atau cursor SVG)
   - Separator visual antara Cursor tool dan warna picker
   - Layout: `[↖ Cursor] | [🟡] [🟢] [🔴] [🔵] [🟣]`
   - Cursor tool aktif by default saat file dibuka
   - Active state: border/background highlight untuk tool yang aktif

2. Mode state — ganti dari `activeColor` menjadi `activeTool`:
   ```js
   // Tool state
   activeTool: 'cursor' | 'yellow' | 'green' | 'red' | 'blue' | 'purple'
   ```
   - Klik Cursor → `activeTool = 'cursor'`
   - Klik warna → `activeTool = warna tersebut`
   - Klik warna yang sudah aktif → **tidak** kembali ke cursor (tetap di draw mode)
   - `Esc` key → kembali ke `activeTool = 'cursor'`

3. Draw mode behaviour:
   - Setelah mouse up (selesai draw satu highlight) → **tetap di draw mode warna yang sama**
   - Tidak otomatis kembali ke cursor
   - User harus eksplisit klik Cursor atau tekan `Esc` untuk exit draw mode

4. Cursor visual saat draw mode aktif:
   - Cursor berubah jadi `crosshair` di atas area slide
   - Cursor normal di luar area slide

**Verify:**
- Default buka file → Cursor tool aktif
- Klik warna → draw mode aktif, cursor jadi crosshair di slide
- Draw highlight → selesai, tetap di draw mode warna sama, bisa draw lagi langsung
- Klik warna aktif → tetap draw mode (tidak exit)
- Tekan `Esc` → kembali ke Cursor tool
- Klik Cursor tool → kembali ke Cursor tool

**Setelah selesai:**
Commit: `"feat(S8-01): toolbar redesign with cursor tool and persistent draw mode"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ✅ S8-02: Move & Resize Highlight

Buat branch baru:
```
git checkout -b feature/S8-02-highlight-move-resize
```

**Scope:**

Behaviour context-aware saat Cursor tool aktif:

**Hover highlight:**
- Cursor berubah jadi `move` (✋)
- Muncul 8 resize handles di sudut dan sisi tengah kotak (kecil, ~8px, warna highlight)
- Handle di sudut → cursor `nwse-resize` / `nesw-resize`
- Handle di sisi → cursor `ew-resize` / `ns-resize`

**Drag highlight (move):**
- Drag dari dalam kotak (bukan handle) → move highlight
- Kotak ikut posisi mouse, koordinat diupdate real-time
- Mouse up → simpan koordinat baru (normalized 0–1) ke notes JSON via auto-save

**Drag handle (resize):**
- Drag handle sudut/sisi → resize kotak
- Min ukuran: 2% × 2% normalized (hindari kotak terlalu kecil)
- Mouse up → simpan ukuran baru ke notes JSON

**Implementasi di `HighlightOverlay.jsx`:**
- SVG overlay sudah ada — tambah logic drag pada `<rect>` highlight
- Track: `isDragging`, `dragType: 'move'|'resize'`, `dragHandle`, `dragStart`
- `onMouseMove` di SVG → update posisi/ukuran sementara (preview)
- `onMouseUp` → commit ke state + trigger auto-save

**Rules:**
- Koordinat selalu dalam normalized 0–1 — convert dari pixel saat drag, simpan normalized
- Highlight tidak boleh keluar batas slide (clamp ke 0–1)
- Move & resize hanya aktif saat `activeTool === 'cursor'`
- Saat draw mode aktif (warna dipilih) → drag di atas highlight = draw highlight baru, bukan move

**Verify:**
- Cursor tool aktif, hover highlight → cursor jadi ✋, handles muncul
- Drag highlight → pindah posisi, tersimpan di JSON
- Drag corner handle → resize, tersimpan di JSON
- Highlight tidak bisa keluar batas slide
- Draw mode aktif → drag di atas highlight = draw baru (bukan move)
- Reload app → posisi & ukuran baru tersimpan

**Setelah selesai:**
Commit: `"feat(S8-02): move and resize highlight with drag handles"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S8-03: Pan Slide saat Zoom In

Buat branch baru:
```
git checkout -b feature/S8-03-pan-slide
```

**Scope:**

Pan hanya aktif saat `zoom > 1.0`. Saat zoom normal (1.0) tidak ada yang di-pan.

**Behaviour context-aware (Cursor tool aktif):**
```
Zoom > 1.0, drag di slide kosong  → pan viewport (geser slide)
Zoom > 1.0, drag di atas highlight → move highlight (S8-02)
Zoom = 1.0, drag di mana pun      → tidak ada efek
```

**Implementasi:**
1. `src/components/SlideViewer.jsx` — tambah pan state:
   - `panX: number`, `panY: number` — offset viewport dalam pixel
   - Reset ke `{ 0, 0 }` saat ganti slide atau zoom reset

2. Canvas container — apply transform gabungan:
   ```css
   transform: translate(panX px, panY px) scale(zoom);
   transform-origin: top left;
   ```

3. Mouse event di slide area:
   - `onMouseDown` di slide (bukan di highlight) → mulai pan, cursor jadi `grabbing`
   - `onMouseMove` → update panX/panY
   - `onMouseUp` → stop pan
   - Clamp pan agar slide tidak keluar batas container sepenuhnya

4. `HighlightOverlay.jsx` — pan tidak mempengaruhi koordinat highlight (highlight ikut canvas, bukan viewport)

5. Cursor visual:
   - Zoom > 1.0, hover slide kosong → cursor `grab`
   - Zoom > 1.0, sedang drag → cursor `grabbing`
   - Zoom = 1.0 → cursor normal

**Verify:**
- Zoom in → drag slide kosong = pan viewport, slide bergeser
- Zoom in → drag di atas highlight = move highlight (bukan pan)
- Zoom out ke 100% → drag tidak melakukan apa-apa
- Ganti slide → pan reset ke posisi awal
- Zoom reset (Cmd+0) → pan juga reset

**Setelah selesai:**
Commit: `"feat(S8-03): pan slide viewport on drag when zoomed in"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

### ⬜ S8-04: Draggable Panel Divider

Buat branch baru:
```
git checkout -b feature/S8-04-panel-resize
```

**Scope:**

User bisa drag divider antara Slide panel dan Notes panel untuk resize proporsinya.

1. `src/components/PanelDivider.jsx` — komponen divider:
   - Vertical bar tipis (~4px) antara Slide panel dan Notes panel
   - Hover → warna berubah + cursor `col-resize`
   - Drag → resize panel kiri dan kanan secara proporsional

2. `src/App.jsx` — panel width via state:
   ```js
   const [notesPanelWidth, setNotesPanelWidth] = useState(35); // persen
   ```
   - Min notes panel: 20%
   - Max notes panel: 50%
   - Slide panel = sisa setelah thumbnail (~220px) dan notes panel
   - Apply via inline style: `width: \`${notesPanelWidth}%\``

3. Drag logic di `PanelDivider.jsx`:
   - `onMouseDown` → mulai drag, attach `mousemove` + `mouseup` ke `document`
   - `onMouseMove` → hitung delta X, update `notesPanelWidth`
   - `onMouseUp` → stop drag, detach listeners
   - Simpan ke `localStorage` saat drag selesai

4. Persist & restore:
   - Load dari `localStorage` saat app buka
   - Key: `slidenotes-notes-panel-width`
   - Fallback ke 35 jika tidak ada

**Verify:**
- Hover divider → cursor `col-resize`, divider highlight
- Drag kanan → notes panel melebar, slide panel menyempit
- Drag kiri → notes panel menyempit, slide panel melebar
- Min/max terpenuhi — tidak bisa drag terlalu kecil/besar
- Reload app → proporsi panel tersimpan
- Thumbnail sidebar tidak terpengaruh (lebar fixed ~220px)

**Setelah selesai:**
Commit: `"feat(S8-04): draggable panel divider with localStorage persist"`
Push dan merge ke `develop`. Laporkan hasilnya.

---

## Checklist v1.3

- [x] S8-01 Toolbar redesign & draw mode
- [x] S8-02 Move & resize highlight
- [ ] S8-03 Pan slide saat zoom in
- [ ] S8-04 Draggable panel divider

---

*Update status task (⬜ → ✅) setiap kali task selesai dan di-merge ke develop.*