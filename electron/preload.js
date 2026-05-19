// IPC bridge — exposeInMainWorld added in S1-02
//
// Channels (see AGENT.md IPC API Contract):
// - open-file-dialog  → string | null
// - load-notes        → filePath → NotesFile | null
// - save-notes        → { filePath, notes } → { ok: boolean }
// - export-pdf        → { filePath, slideImages, notes } → { ok, exportPath }
