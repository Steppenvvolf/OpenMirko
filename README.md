# OpenMirko

An open-source, local-first infinite canvas whiteboard.

Think Miro, but yours. No account. No vendor lock. No server required.
Self-host it, fork it, ship it.

## What it is

OpenMirko is a browser-based infinite whiteboard for maps, roadmaps, planning,
diagrams and brainstorming. Everything lives in your browser; export and
import boards as plain JSON.

## Status

Early. v0.1 is a working single-player canvas: pan, zoom, sticky notes,
rectangles, ellipses, text, arrows/connectors, selection, resize,
undo/redo, and JSON import/export. Multiplayer and a sync server are the
next milestone (see ROADMAP.md).

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
```

Build a static bundle:

```bash
npm run build     # -> dist/
npm run preview
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
