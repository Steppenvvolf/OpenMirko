// The board document model: shapes, connectors, and geometry helpers.

import type { BoardState, Connector, Shape, ShapeType } from './types'
import { CONNECTOR_COLOR, SHAPE_DEFAULTS, uid } from './types'

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
    const shape: Shape = {
      id: uid('s'),
      type,
      x: x - d.w / 2,
      y: y - d.h / 2,
      w: d.w,
      h: d.h,
      text: '',
      color: d.color,
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
    // connectors referencing a removed shape are dropped too
    this.state.connectors = this.state.connectors.filter(
      (c) => c.fromId !== id && c.toId !== id,
    )
  }

  removeMany(ids: Set<string>): void {
    for (const id of ids) this.remove(id)
  }

  replace(state: BoardState): void {
    this.state = state
  }

  clone(): BoardState {
    return JSON.parse(JSON.stringify(this.state)) as BoardState
  }

  // ---- geometry -----------------------------------------------------------

  /** A shape's center in world coordinates. */
  centerOf(s: Shape): { x: number; y: number } {
    return { x: s.x + s.w / 2, y: s.y + s.h / 2 }
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
