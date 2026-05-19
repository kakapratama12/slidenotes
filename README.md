# SlideNotes

SlideNotes is a macOS desktop app for taking notes while you present from a PDF. Open your slide deck, add per-slide notes and color-coded highlights, and export everything as a single PDF when you are done.

Built for presenters, teachers, and anyone who wants slide-specific notes without leaving the deck.

## Download

Pre-built `.dmg` installers are available on GitHub — no build required.

**[Latest release](https://github.com/kakapratama12/slidenotes/releases/latest)**

| Mac type | Download |
|----------|----------|
| Apple Silicon (M1/M2/M3/M4) | [SlideNotes-arm64.dmg](https://github.com/kakapratama12/slidenotes/releases/latest/download/SlideNotes-1.4.1-arm64.dmg) |
| Intel | [SlideNotes-x64.dmg](https://github.com/kakapratama12/slidenotes/releases/latest/download/SlideNotes-1.4.1.dmg) |

> On the [releases page](https://github.com/kakapratama12/slidenotes/releases), pick the asset that matches your Mac. File names follow `SlideNotes-{version}-arm64.dmg` and `SlideNotes-{version}.dmg`.

## Requirements (build from source)

- **macOS** (for running and building the app)
- **Node.js 20+**
- **npm** (comes with Node.js)

## Installation & development

```bash
git clone https://github.com/kakapratama12/slidenotes.git
cd slidenotes
npm install
npm run dev
```

`npm run dev` starts the Vite dev server and Electron. The app window should open automatically.

## Build `.app`

```bash
npm run build
```

Output is written to `release/`:

- `release/mac-arm64/SlideNotes.app` — Apple Silicon
- `release/mac/SlideNotes.app` — Intel
- `release/SlideNotes-{version}-arm64.dmg` and `release/SlideNotes-{version}.dmg` — installable disk images

## First launch (unsigned build)

SlideNotes is not Apple-notarized yet. On first open, macOS may block the app.

1. Right-click **SlideNotes.app** (or the mounted `.dmg` app)
2. Choose **Open**
3. Click **Open** again in the dialog

After that, you can open it normally from Applications or the Dock.

## Tech stack

- **Electron** — desktop shell and native APIs (file dialogs, PDF export)
- **React** — UI
- **Vite** — dev server and production bundling
- **Tailwind CSS** — styling
- **pdf.js** — render PDF slides in the viewer
- **pdf-lib** — export slides + notes to PDF
