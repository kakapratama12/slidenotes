# ADR.md
## Architecture Decision Records — SlideNotes

Dokumen ini mencatat keputusan teknis yang dibuat selama development,
terutama yang tidak ada di spec awal (PRD.md / AGENT.md).

Baca sebelum membuat keputusan arsitektur baru.

---

## Format

```
### ADR-XX: Judul Singkat
- **Status:** accepted | superseded | deprecated
- **Task:** S#-##
- **Konteks:** Mengapa keputusan ini perlu dibuat
- **Keputusan:** Apa yang dipilih
- **Konsekuensi:** Dampak / hal yang perlu diperhatikan ke depan
```

---

## Records

### ADR-01: `env -u ELECTRON_RUN_AS_NODE` di dev script
- **Status:** accepted
- **Task:** S1-01
- **Konteks:** Cursor (dan beberapa AI agent environment) men-set `ELECTRON_RUN_AS_NODE=1` secara default. Variable ini menyebabkan `require('electron')` gagal dan Electron window tidak bisa terbuka.
- **Keputusan:** Script `dev` di `package.json` wajib unset variable tersebut:
  ```json
  "dev": "concurrently \"vite\" \"env -u ELECTRON_RUN_AS_NODE electron .\""
  ```
- **Konsekuensi:** Jangan hapus `env -u ELECTRON_RUN_AS_NODE` dari dev script. Berlaku selama development di Cursor atau environment serupa.

---

### ADR-02: IPC channel `read-pdf-file` untuk baca file PDF
- **Status:** accepted
- **Task:** S2-02
- **Konteks:** Renderer berjalan di `localhost:5173` (Vite dev server). Karena security policy Electron, renderer tidak bisa mengakses `file://` URL secara langsung menggunakan `pdfjsLib.getDocument(filePath)`. Request ke path lokal diblokir.
- **Keputusan:** Tambah IPC channel `read-pdf-file` di main process yang membaca file via `fs.readFile()` dan mengembalikan bytes sebagai `ArrayBuffer`. Renderer memanggil `getDocument({ data: arrayBuffer })` via `readPdfFile()`.
- **Konsekuensi:** Channel ini tidak ada di spec awal AGENT.md (sudah di-update). Semua akses file PDF harus tetap lewat IPC, tidak boleh direct `file://` dari renderer.

---

### ADR-03: `hydrateNotes()` dan reset state saat ganti file
- **Status:** accepted
- **Task:** S3-02
- **Konteks:** Saat user membuka PDF kedua setelah PDF pertama, notes dari file pertama sempat muncul sebentar (flash) sebelum notes file kedua di-load. Selain itu, struktur JSON dari file perlu dinormalisasi (pastikan setiap slide punya `note` string dan `highlights` array) sebelum masuk ke state.
- **Keputusan:** Tambah dua behavior di `useNotes.js`:
  1. Reset notes ke object kosong segera saat `filePath` berubah (sebelum load async selesai)
  2. `hydrateNotes()` — normalisasi data dari file sebelum set ke state
- **Konsekuensi:** State notes selalu dalam format yang konsisten. Tidak ada flash notes lama saat ganti file.

---

*Tambahkan ADR baru setiap kali ada keputusan teknis yang tidak ada di spec awal.*
*Format: ADR-XX dengan nomor urut berikutnya.*