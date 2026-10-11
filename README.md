# OpenMirko

An open-source, local-first infinite canvas whiteboard.

Think Miro, but yours. No account. No vendor lock. No server required.
Self-host it, fork it, ship it.

## What it is

OpenMirko is a browser-based infinite whiteboard for maps, roadmaps, planning,
diagrams and brainstorming. Everything lives in your browser; export and
import boards as plain JSON.

## Status

v0.2. A working single-player canvas: pan/zoom, eleven shape types (sticky,
rect, ellipse, diamond, triangle, hexagon, star, cloud, pen, frame, text),
connectors, selection, resize, undo/redo, copy/paste/duplicate, align/distribute,
snap-to-grid, per-shape colors, freehand drawing, frames that move their
contained shapes, and JSON import/export. Ships as both a web app and a Tauri
desktop app. Multiplayer and a sync server are the next milestone (see
ROADMAP.md).

## Run it

Web (browser):

```bash
npm install
npm run dev       # http://localhost:5173
```

Desktop app (Tauri; requires Rust and WebView2, preinstalled on Windows 10/11):

```bash
npm run desktop       # opens a native window with hot reload
npm run desktop:build # builds a native installer
```

Build a static bundle:

```bash
npm run build     # -> dist/
npm run preview
```

Test and typecheck:

```bash
npm test
npm run typecheck
```

## Why OpenMirko exists

- The big whiteboards are closed, hosted, and expensive at team scale.
- You should own your boards, not rent them.
- Open source plus local-first means your data and your tool outlive any vendor.

## Origin

OpenMirko's architecture is a generalized rewrite of an in-house roadmap
board, informed by a clean-room feature analysis of Miro's desktop shell.
No Miro code is copied; see ARCHITECTURE.md for the line we draw.

## License

MIT. See LICENSE.
