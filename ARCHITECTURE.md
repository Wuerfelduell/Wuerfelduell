# DiceDuel architecture

This repository still deploys as a static website, so GitHub Pages keeps working without a server-side build step. The generated files required at runtime are committed alongside their sources.

## Current transition layer

- `index.html` is the browser entry point.
- `src/styles/legacy/` contains the editable CSS sources in their established cascade order.
- `css/app.css` is the generated runtime bundle loaded by the website and later by the APK WebView.
- `scripts/` contains dependency-free build and verification tools.
- `js/` remains the current runtime JavaScript layer until the next architecture phase extracts stable modules.

Run the checks with Node.js 20 or newer:

```sh
npm run build
npm run check
```

## Why the bundle is committed

GitHub Pages serves repository files directly. Committing `css/app.css` means the site remains deployable from the repository root, while developers edit organized sources under `src/`. The same generated web package can later be embedded in an APK without maintaining a second UI codebase.

## Planned boundaries

1. UI and rendering code
2. Deterministic combat/domain engine
3. Local persistence adapter
4. Remote API adapter for accounts, campaign progress, profiles and global statistics
5. Platform adapters for browser/PWA and Android APK

The game must call stable interfaces rather than Firebase or any future provider directly. That keeps backend replacement possible and gives web and APK clients the same behavior.
