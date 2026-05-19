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

**Setelah selesai:** Commit: `"feat(S1-01): scaffold Electron + React + Vite + Tailwind"` Push dan merge ke `develop`. Laporkan hasilnya.

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

1. `electron/main.js` — tambah semua `ipcMain.handle`:
  - `open-file-dialog` → gunakan `dialog.showOpenDialog`, filter `.pdf` only
  - `load-notes` → stub, return `null` untuk sekarang
  - `save-notes` → stub, return `{ ok: true }`
  - `export-pdf` → stub, return `{ ok: true, exportPath: '' }`
2. `src/App.jsx` — tambah test button sementara:
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

**Setelah selesai:** Hapus test button dari `App.jsx`. Commit: `"feat(S1-02): setup IPC bridge with stubbed handlers"` Push dan merge ke `develop`. Laporkan hasilnya.

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

**Setelah selesai:** Commit: `"feat(S2-01): file open via picker and drag-drop"` Push dan merge ke `develop`. Laporkan hasilnya.

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

**Setelah selesai:** Commit: `"feat(S2-02): PDF rendering and slide navigation"` Push dan merge ke `develop`. Laporkan hasilnya.

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

**Setelah selesai:** Commit: `"feat(S2-03): thumbnail sidebar with active highlight"` Push dan merge ke `develop`. Laporkan hasilnya.

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

**Setelah selesai:** Commit: `"feat(S3-01): notes panel with debounced auto-save"` Push dan merge ke `develop`. Laporkan hasilnya.

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

**Setelah selesai:** Commit: `"feat(S3-02): load persistent notes on file open"` Push dan merge ke `develop`. Laporkan hasilnya.

---

### ✅ S3-03: Export PDF

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

**Setelah selesai:** Commit: `"feat(S3-03): export slides and notes as PDF"` Push dan merge ke `develop`. Laporkan hasilnya.

---

## Sprint 4 — Polish & Build

### ✅ S4-01: Polish & Error Handling

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

**Setelah selesai:** Commit: `"feat(S4-01): polish UI and add error handling"` Push dan merge ke `develop`. Laporkan hasilnya.

---

### ✅ S4-02: Build & Package

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

**Setelah selesai:** Commit: `"feat(S4-02): electron-builder config and production build"` Push dan merge ke `develop`. Laporkan hasilnya.

---

## Checklist MVP

- [x] S1-01 Project scaffold
- [x] S1-02 IPC bridge
- [x] S2-01 File open
- [x] S2-02 Slide rendering
- [x] S2-03 Thumbnail sidebar
- [x] S3-01 Notes panel + auto-save
- [x] S3-02 Persistent notes
- [x] S3-03 Export PDF
- [x] S4-01 Polish
- [x] S4-02 Build

---

*Update status task (⬜ → ✅) setiap kali task selesai dan di-merge ke develop.*