// The board document model: shapes, connectors, and geometry helpers.

import type { BoardState, Connector, Shape, ShapeType } from './types'
import { CONNECTOR_COLOR, DEFAULT_FONT_SIZE, SHAPE_DEFAULTS, uid } from './types'

export class Board {
  state: BoardState

  constructor(state: BoardState) {
    this.state = state
  }

  // ---- lookups -----------------------------------------------------------

  shape(id: string): Shape | undefined {
    return this.state.shapes.find((s) => s.id === id)
  }

  connector(id: string): Connector | undefined {
    return this.state.connectors.find((c) => c.id === id)
  }

  // ---- mutations ----------------------------------------------------------

  addShape(type: ShapeType, x: number, y: number): Shape {
    const d = SHAPE_DEFAULTS[type]
    if (type === 'pen') {
      const shape: Shape = {
        id: uid('s'),
        type,
        x,
        y,
        w: 1,
        h: 1,
        text: '',
        color: d.color,
        points: [{ x, y }],
        strokeWidth: 2.5,
      }
      this.state.shapes.push(shape)
      return shape
    }
    const shape: Shape = {
      id: uid('s'),
      type,
      x: x - d.w / 2,
      y: y - d.h / 2,
      w: d.w,
      h: d.h,
      text: type === 'frame' ? 'Frame' : '',
      color: d.color,
      fontSize: d.fontSize ?? DEFAULT_FONT_SIZE,
    }
    this.state.shapes.push(shape)
    return shape
  }

  addConnector(fromId: string, toId: string): Connector {
    const connector: Connector = {
      id: uid('c'),
      kind: 'arrow',
      fromId,
      toId,
      color: CONNECTOR_COLOR,
    }
    this.state.connectors.push(connector)
    return connector
  }

  remove(id: string): void {
    this.state.shapes = this.state.shapes.filter((s) => s.id !== id)
    // Drop connectors that reference a removed shape, and allow removing a
    // connector directly by its own id (selected connector + Delete).
    this.state.connectors = this.state.connectors.filter(
      (c) => c.id !== id && c.fromId !== id && c.toId !== id,
    )
  }

  removeMany(ids: Set<string>): void {
    for (const id of ids) this.remove(id)
  }

  /** Move the given shapes to the front (top) or back (bottom) of the z-order,
   *  preserving their relative order. */
  reorderMany(ids: Set<string>, dir: 'front' | 'back'): void {
    const selected = this.state.shapes.filter((s) => ids.has(s.id))
    const rest = this.state.shapes.filter((s) => !ids.has(s.id))
    this.state.shapes = dir === 'front' ? [...rest, ...selected] : [...selected, ...rest]
  }

  replace(state: BoardState): void {
    this.state = state
  }

  clone(): BoardState {
    return JSON.parse(JSON.stringify(this.state)) as BoardState
  }

  // ---- copy / paste (detached subgraph) -----------------------------------

  /**
   * Detached copy of the given shapes and the connectors linking them, with
   * fresh ids. Connectors whose endpoint is outside the selection are dropped.
   */
  copySelection(ids: Set<string>): { shapes: Shape[]; connectors: Connector[] } {
    const idMap = new Map<string, string>()
    const shapes: Shape[] = []
    for (const s of this.state.shapes) {
      if (!ids.has(s.id)) continue
      const nid = uid('s')
      idMap.set(s.id, nid)
      shapes.push({ ...s, id: nid, points: s.points ? s.points.map((p) => ({ ...p })) : undefined })
    }
    const connectors: Connector[] = []
    for (const c of this.state.connectors) {
      const f = idMap.get(c.fromId)
      const t = idMap.get(c.toId)
      if (!f || !t) continue
      connectors.push({ ...c, id: uid('c'), fromId: f, toId: t })
    }
    return { shapes, connectors }
  }

  /**
   * Insert a detached subgraph (from copySelection) into the board with fresh
   * ids and an (x, y) offset. Returns the ids of the inserted items.
   */
  pasteSubgraph(
    sub: { shapes: Shape[]; connectors: Connector[] },
    dx: number,
    dy: number,
  ): { shapeIds: string[]; connectorIds: string[] } {
    const idMap = new Map<string, string>()
    const shapeIds: string[] = []
    for (const s of sub.shapes) {
      const nid = uid('s')
      idMap.set(s.id, nid)
      shapeIds.push(nid)
      this.state.shapes.push({
        ...s,
        id: nid,
        x: s.x + dx,
        y: s.y + dy,
        points: s.points ? s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : undefined,
      })
    }
    const connectorIds: string[] = []
    for (const c of sub.connectors) {
      const f = idMap.get(c.fromId)
      const t = idMap.get(c.toId)
      if (!f || !t) continue
      const nid = uid('c')
      connectorIds.push(nid)
      this.state.connectors.push({ ...c, id: nid, fromId: f, toId: t })
    }
    return { shapeIds, connectorIds }
  }

  // ---- geometry -----------------------------------------------------------

  /** A shape's center in world coordinates. */
  centerOf(s: Shape): { x: number; y: number } {
    return { x: s.x + s.w / 2, y: s.y + s.h / 2 }
  }

  /**
   * Ids of all shapes (recursively, including nested frames) whose center
   * lies inside the given frame's bounds. The frame itself is excluded.
   */
  shapesInside(frameId: string): Set<string> {
    const result = new Set<string>()
    const queue = [frameId]
    const visited = new Set<string>([frameId])
    while (queue.length) {
      const fid = queue.pop()!
      const f = this.shape(fid)
      if (!f) continue
      for (const s of this.state.shapes) {
        if (visited.has(s.id)) continue
        const cx = s.x + s.w / 2
        const cy = s.y + s.h / 2
        if (cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h) {
          result.add(s.id)
          visited.add(s.id)
          if (s.type === 'frame') queue.push(s.id)
        }
      }
    }
    return result
  }

  /** The point on a shape's bounding box edge toward (tx, ty). */
  anchorOn(s: Shape, tx: number, ty: number): { x: number; y: number } {
    const c = this.centerOf(s)
    const dx = tx - c.x
    const dy = ty - c.y
    if (dx === 0 && dy === 0) return c
    const halfW = s.w / 2
    const halfH = s.h / 2
    const sx = dx === 0 ? Infinity : halfW / Math.abs(dx)
    const sy = dy === 0 ? Infinity : halfH / Math.abs(dy)
    const k = Math.min(sx, sy)
    return { x: c.x + dx * k, y: c.y + dy * k }
  }

  /** Endpoints (world coords) for a connector, or null if either end is gone. */
  connectorEndpoints(c: Connector): { x1: number; y1: number; x2: number; y2: number } | null {
    const from = this.shape(c.fromId)
    const to = this.shape(c.toId)
    if (!from || !to) return null
    const a = this.centerOf(from)
    const b = this.centerOf(to)
    const start = this.anchorOn(from, b.x, b.y)
    const end = this.anchorOn(to, a.x, a.y)
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y }
  }
}
