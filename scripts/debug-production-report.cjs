/**
 * Simulates packaged renderer load and prints a DevTools-style report.
 * Usage: env -u ELECTRON_RUN_AS_NODE electron scripts/debug-production-report.cjs
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const asar = path.join(__dirname, '../release/mac-arm64/SlideNotes.app/Contents/Resources/app.asar');
const indexHtml = path.join(asar, 'dist/index.html');

async function runScenario(name, load) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  const consoleLog = [];
  const network = [];
  const failures = [];

  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    consoleLog.push({ level, message: message.slice(0, 500), line, sourceId });
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    failures.push({ code, desc, url });
  });
  win.webContents.session.webRequest.onCompleted((details) => {
    if (['mainFrame', 'script', 'stylesheet'].includes(details.resourceType)) {
      network.push({
        status: details.statusCode,
        type: details.resourceType,
        url: details.url,
      });
    }
  });

  let loadError = null;
  try {
    await load(win);
  } catch (err) {
    loadError = String(err);
  }
  await new Promise((r) => setTimeout(r, 800));

  let dom = null;
  try {
    dom = await win.webContents.executeJavaScript(`({
      documentURL: location.href,
      contentType: document.contentType,
      bodyTextStart: (document.body?.innerText || '').slice(0, 300),
      rootChildCount: document.getElementById('root')?.childElementCount ?? 0,
      looksLikeRawCss: (document.body?.innerText || '').includes('border-slate-100'),
    })`);
  } catch (err) {
    dom = { executeJavaScriptError: String(err) };
  }

  win.destroy();
  return { name, loadError, dom, failures, network, console: consoleLog.filter((c) => c.level >= 2) };
}

app.whenReady().then(async () => {
  const reports = [];
  reports.push(
    await runScenario('v1.3.1 loadURL', (win) => win.loadURL(pathToFileURL(indexHtml).href)),
  );
  reports.push(await runScenario('v1.3.0 loadFile', (win) => win.loadFile(indexHtml)));
  const fs = require('fs');
  const out = path.join(__dirname, '../tmp-devtools-report.json');
  fs.writeFileSync(out, JSON.stringify(reports, null, 2));
  console.log('Wrote', out);
  app.exit(0);
});

setTimeout(() => {
  process.stderr.write('[timeout]\n');
  app.exit(1);
}, 20000);
