# OpenMirko — Architecture

## What this document is

Two things: (1) a clean-room feature/architecture analysis of the reference
targets, and (2) the design decisions for OpenMirko itself. The line we draw
is explicit below.

## The line we draw (legal + ethical)

OpenMirko is inspired by how Miro works. It does not contain Miro code.

- We use REA (Reverse Engineer Anything) to understand *architecture and
  behavior*: what processes a target runs, how its modules are laid out,
  what an Electron shell does. That is lawful reverse-engineering research.
- We never copy Miro's minified source, strings, or assets into this repo.
  Copying proprietary code into an MIT project would be copyright
  infringement and would sink OpenMirko the moment it shipped.
- OpenMirko's own board engine is a clean, original implementation. Its
  foundation is a generalization of Stefan's own in-house board, which he
  owns outright.

## Target 1 — Miro desktop client (v0.11.168)

Analyzed: `RealtimeBoard/resources/app.asar`.

Findings (REA `analyze-javascript-application` over the extracted `app_bundle`):

- `app_bundle/main.js` (~7 MB, main process), `renderer.js` (~2.3 MB),
  `preload/preload.js` (~2.8 MB), plus a couple of small preload/native shims.
- 9 parsed JS files, ~1.3 M AST nodes, ~9,400 findings. The bundles ship
  source maps, which let REA resolve real module paths — including a large
  tree of third-party error-tracking SDK modules.
- **Electron boundary reconstruction:** one context-bridge API and a handful
  of IPC channels, all owned by a third-party error-tracking SDK. No
  board-related IPC, no resolved native addon bindings.
- Recovered endpoints are telemetry/tracing headers plus a single board-lookup
  API — i.e. shell plumbing, not the board engine.

Key conclusion: **the board itself is a web application, and the desktop
shell's JavaScript is almost entirely Sentry telemetry plumbing plus a thin
preload.** The desktop client is packaging. Therefore OpenMirko is a web app
first; a desktop shell (Tauri or Electron) is a later, optional packaging
step.

## Target 2 — DemoRoadmap (Stefan's in-house board)

Analyzed: `DemoRoadmap-main/`.

Findings:

- Pure static `file://` app: no build step, no server, no ES modules,
  classic `<script>` tags only, one global `Board` namespace.
- Module breakdown (what it already does well):
  - `core.js` — namespace, `Board.require`, `util`, `events` (pub/sub).
  - `schema.js`, `store.js` — data model + in-memory store.
  - `history.js` — undo/redo. `persist.js` — localStorage + export.
  - `view.js` — pan/zoom. `connections.js` — SVG arrows.
  - `render.js` / `cards.js` + `card-*` — DOM card renderers.
  - `interact.js`, `chrome.js` (toolbar), `search.js`, `minimap.js`,
    `present.js`, `boot.js`.
- Content lives in a merge-friendly `board-data.js` (one entity per line,
  no volatile fields).

What DemoRoadmap is missing for "Miro-like": rich shape types, freehand,
multi-select/resize, frames, comments, templates, and **real-time
multiplayer**.

## OpenMirko design decisions

| Decision | Choice | Why |
|---|---|---|
| Platform | Web app first | Miro's board is web; desktop is packaging |
| Language | TypeScript (strict) | Correctness + contributor safety at scale |
| Build | Vite | Standard, fast, zero-config TS |
| Rendering | DOM + SVG (transform pan/zoom) | Crisp text editing, proven in DemoRoadmap |
| Dependencies | Zero runtime deps | Light, auditable, no lock-in |
| Persistence | localStorage + JSON import/export | Local-first now; sync server later |
| Multiplayer | Yjs (CRDT) later | The Miro-grade answer, decoupled from v0 |

## Directory layout

```
src/
  types.ts      — shared interfaces (objects, board state)
  viewport.ts   — pan/zoom + world<->screen transforms
  objects.ts    — object factories + serialization
  render.ts     — DOM/SVG rendering of objects + connectors
  interact.ts   — pointer events: select/move/resize/create
  history.ts    — undo/redo stack
  persist.ts    — localStorage autosave + export/import
  main.ts       — bootstrap, toolbar, keyboard shortcuts
  style.css
```

## Coordinate system

World coordinates are the source of truth. The viewport applies a CSS
`transform: translate(x, y) scale(zoom)` to a container, so every object is
positioned in world units and scales/translates for free. Connectors live in
an SVG inside that same container, drawn in world coordinates.

## Clean-room methodology (how REA was used)

1. Enumerate the target's file/module structure (REA application graph).
2. Identify process roles (main / renderer / preload) and IPC surface.
3. Extract *behavioral facts* (what each layer is responsible for).
4. Write OpenMirko's architecture from those facts plus first principles —
   never from Miro's source.
