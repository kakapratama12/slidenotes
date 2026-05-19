const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readPdfFile: (filePath) => ipcRenderer.invoke('read-pdf-file', filePath),
  loadNotes: (filePath) => ipcRenderer.invoke('load-notes', filePath),
  saveNotes: (filePath, notes) => ipcRenderer.invoke('save-notes', { filePath, notes }),
  exportPdf: (filePath, slideImages, notes) =>
    ipcRenderer.invoke('export-pdf', { filePath, slideImages, notes }),
});
