const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');
const { exportNotesPdf } = require('./exporter');

function getRendererIndexPath() {
  return path.join(app.getAppPath(), 'dist', 'index.html');
}

function getNotesJsonPath(filePath) {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}.slidenotes.json`);
}

let mainWindow = null;

function registerIpcHandlers() {
  ipcMain.handle('open-file-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    return filePaths[0];
  });

  ipcMain.handle('read-pdf-file', async (_event, filePath) => {
    const buffer = await fs.readFile(filePath);
    return Uint8Array.from(buffer);
  });

  ipcMain.handle('file-exists', async (_event, filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('load-notes', async (_event, filePath) => {
    const jsonPath = getNotesJsonPath(filePath);

    try {
      const raw = await fs.readFile(jsonPath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      console.warn('load-notes: failed to read or parse notes file', error);
      return null;
    }
  });

  ipcMain.handle('save-notes', async (_event, { filePath, notes }) => {
    try {
      const jsonPath = getNotesJsonPath(filePath);
      const payload = {
        version: 1,
        sourceFile: filePath,
        lastOpened: new Date().toISOString(),
        slides: notes,
      };

      await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf-8');
      return { ok: true };
    } catch (error) {
      console.error('save-notes failed:', error);
      return { ok: false };
    }
  });

  ipcMain.handle('export-pdf', async (_event, { filePath, slideImages, notes, layout }) => {
    try {
      const exportPath = await exportNotesPdf({ filePath, slideImages, notes, layout });
      return { ok: true, exportPath };
    } catch (error) {
      console.error('export-pdf failed:', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('set-window-title', (_event, title) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(title);
    }
  });
}

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = getRendererIndexPath();
    mainWindow.loadURL(pathToFileURL(indexPath).href);
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
