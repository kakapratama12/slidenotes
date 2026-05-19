const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');

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

  ipcMain.handle('load-notes', async () => {
    return null;
  });

  ipcMain.handle('save-notes', async (_event, { filePath, notes }) => {
    try {
      const parsed = path.parse(filePath);
      const jsonPath = path.join(parsed.dir, `${parsed.name}.slidenotes.json`);
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

  ipcMain.handle('export-pdf', async () => {
    return { ok: true, exportPath: '' };
  });
}

function createWindow() {
  const isDev = !app.isPackaged;

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
