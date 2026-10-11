# OpenMirko — Roadmap

## v0.1 (now) — single-player core

- [x] Infinite canvas: pan (space / middle-drag / drag empty), zoom (wheel)
- [x] Objects: sticky note, rectangle, ellipse, text label
- [x] Connectors: arrow/line between two objects, live re-routing
- [x] Selection, move, resize, multi-select (shift / marquee)
- [x] Undo / redo
- [x] Autosave (localStorage) + JSON export / import
- [x] Toolbar + keyboard shortcuts

## v0.2 — richer objects

- [ ] Freehand pen
- [ ] Shape library: diamond, triangle, hexagon, star, cloud
- [ ] Frames (group containers)
- [ ] Mind-map auto-layout (sticky + connectors)
- [ ] Colors, borders, font sizing per object
- [ ] Copy / paste / duplicate / align / distribute
- [ ] Grid + snap, ruler

## v0.3 — collaboration

- [ ] Yjs CRDT document model
- [ ] Presence (cursors, live editing)
- [ ] Sync server (self-hostable, e.g. Hocuspocus or a minimal WebSocket impl)
- [ ] Room links, no-account guests

## v0.4 — boards at scale

- [ ] Multiple boards + folders (local first)
- [ ] Comments / mentions
- [ ] Templates
- [ ] Export PNG / SVG / PDF
- [ ] Search across boards

## v0.5 — shipping

- [ ] Tauri desktop shell (optional)
- [ ] Plugin / extension system
- [ ] Accessibility pass
- [ ] i18n

## Principles

- Local-first: everything works offline; sync is additive.
- Zero runtime dependencies unless they earn their place.
- Plain JSON board format, human-readable, diffable.
- Never copy proprietary code; always clean-room.
