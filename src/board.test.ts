// Unit tests for the board document model: mutation + geometry helpers.
import { describe, it, expect } from 'vitest'
import { Board } from './board'
import type { BoardState, Shape } from './types'

function makeBoard(): Board {
  const state: BoardState = { version: 1, shapes: [], connectors: [] }
  return new Board(state)
}

function rect(id: string, x: number, y: number, w: number, h: number): Shape {
  return { id, type: 'rect', x, y, w, h, text: '', color: '#ffffff' }
}

describe('Board.addShape', () => {
  it('centers the new shape on the click point with type defaults', () => {
    const b = makeBoard()
    const s = b.addShape('sticky', 100, 100)
    expect(s.x).toBe(100 - s.w / 2)
    expect(s.y).toBe(100 - s.h / 2)
    expect(s.w).toBe(200)
    expect(s.h).toBe(200)
    expect(s.text).toBe('')
    expect(b.state.shapes).toHaveLength(1)
  })

  it('gives every shape a unique id', () => {
    const b = makeBoard()
    const a = b.addShape('rect', 0, 0)
    const c = b.addShape('rect', 0, 0)
    expect(a.id).not.toBe(c.id)
  })
})

describe('Board.remove', () => {
  it('removes connectors that reference a removed shape', () => {
    const b = makeBoard()
    b.state.shapes.push(rect('a', 0, 0, 100, 100), rect('c', 200, 0, 100, 100))
    b.addConnector('a', 'c')
    b.remove('a')
    expect(b.state.shapes.map((s) => s.id)).toEqual(['c'])
    expect(b.state.connectors).toHaveLength(0)
  })

  it('removes a connector when deleted by its own id', () => {
    const b = makeBoard()
    b.state.shapes.push(rect('a', 0, 0, 100, 100), rect('c', 200, 0, 100, 100))
    const conn = b.addConnector('a', 'c')
    expect(b.state.connectors).toHaveLength(1)
    b.remove(conn.id)
    expect(b.state.connectors).toHaveLength(0)
    expect(b.state.shapes).toHaveLength(2) // shapes untouched
  })
})

describe('Board geometry', () => {
  it('centerOf returns the bounding-box center', () => {
    const b = makeBoard()
    expect(b.centerOf(rect('a', 10, 20, 100, 40))).toEqual({ x: 60, y: 40 })
  })

  it('anchorOn returns the edge point toward the target', () => {
    const b = makeBoard()
    const s = rect('a', 0, 0, 100, 100) // center (50,50)
    // target straight right -> right edge midpoint
    expect(b.anchorOn(s, 200, 50)).toEqual({ x: 100, y: 50 })
    // target straight down -> bottom edge midpoint
    expect(b.anchorOn(s, 50, 200)).toEqual({ x: 50, y: 100 })
    // same point -> center
    expect(b.anchorOn(s, 50, 50)).toEqual({ x: 50, y: 50 })
  })

  it('connectorEndpoints returns world-space edge anchors, or null when an end is gone', () => {
    const b = makeBoard()
    b.state.shapes.push(rect('a', 0, 0, 100, 100), rect('c', 200, 0, 100, 100))
    const conn = b.addConnector('a', 'c')
    const ends = b.connectorEndpoints(conn)
    expect(ends).toEqual({ x1: 100, y1: 50, x2: 200, y2: 50 })
    b.remove('a')
    expect(b.connectorEndpoints(conn)).toBeNull()
  })
})

describe('Board.clone', () => {
  it('returns a deep copy that does not alias the live state', () => {
    const b = makeBoard()
    b.addShape('sticky', 0, 0)
    const copy = b.clone()
    copy.shapes[0].x = 9999
    expect(b.state.shapes[0].x).not.toBe(9999)
  })
})

describe('Board copy/paste subgraph', () => {
  it('copySelection returns a detached subgraph with fresh ids', () => {
    const b = makeBoard()
    b.state.shapes.push(rect('a', 0, 0, 100, 100), rect('c', 200, 0, 100, 100))
    b.addConnector('a', 'c')
    const sub = b.copySelection(new Set(['a', 'c']))
    expect(sub.shapes).toHaveLength(2)
    expect(sub.connectors).toHaveLength(1)
    const ids = sub.shapes.map((s) => s.id)
    expect(ids).not.toContain('a')
    expect(ids).not.toContain('c')
    // connector remapped to the new shape ids
    expect(sub.connectors[0].fromId).toBe(ids[0])
    expect(sub.connectors[0].toId).toBe(ids[1])
    // source board untouched
    expect(b.state.shapes).toHaveLength(2)
    expect(b.state.connectors).toHaveLength(1)
  })

  it('drops connectors whose endpoint is not selected', () => {
    const b = makeBoard()
    b.state.shapes.push(rect('a', 0, 0, 100, 100), rect('c', 200, 0, 100, 100))
    b.addConnector('a', 'c')
    const sub = b.copySelection(new Set(['a']))
    expect(sub.shapes).toHaveLength(1)
    expect(sub.connectors).toHaveLength(0)
  })

  it('pasteSubgraph inserts offset copies with remapped connectors', () => {
    const b = makeBoard()
    b.state.shapes.push(rect('a', 0, 0, 100, 100), rect('c', 200, 0, 100, 100))
    b.addConnector('a', 'c')
    const sub = b.copySelection(new Set(['a', 'c']))
    const { shapeIds, connectorIds } = b.pasteSubgraph(sub, 30, 40)
    expect(shapeIds).toHaveLength(2)
    expect(connectorIds).toHaveLength(1)
    expect(b.state.shapes).toHaveLength(4)
    expect(b.state.connectors).toHaveLength(2)
    const pasted = b.shape(shapeIds[0])!
    expect(pasted.x).toBe(30)
    expect(pasted.y).toBe(40)
    const pc = b.connector(connectorIds[0])!
    expect(pc.fromId).toBe(shapeIds[0])
    expect(pc.toId).toBe(shapeIds[1])
  })
})

describe('Board.shapesInside', () => {
  it('returns shapes whose center is inside a frame, excluding itself and outside shapes', () => {
    const b = makeBoard()
    b.state.shapes.push(
      { id: 'f', type: 'frame', x: 0, y: 0, w: 300, h: 300, text: 'F', color: '#fff' },
      { id: 's1', type: 'rect', x: 50, y: 50, w: 100, h: 100, text: '', color: '#fff' }, // center (100,100)
      { id: 's2', type: 'rect', x: 400, y: 400, w: 100, h: 100, text: '', color: '#fff' }, // center (450,450)
    )
    const inside = b.shapesInside('f')
    expect(inside.has('s1')).toBe(true)
    expect(inside.has('s2')).toBe(false)
    expect(inside.has('f')).toBe(false)
  })

  it('finds shapes inside nested frames recursively', () => {
    const b = makeBoard()
    b.state.shapes.push(
      { id: 'f', type: 'frame', x: 0, y: 0, w: 200, h: 200, text: '', color: '#fff' },
      { id: 'f2', type: 'frame', x: 120, y: 120, w: 160, h: 160, text: '', color: '#fff' }, // center (200,200) = on f's edge
      { id: 's3', type: 'rect', x: 240, y: 240, w: 20, h: 20, text: '', color: '#fff' }, // center (250,250): inside f2, NOT inside f
      { id: 'sOut', type: 'rect', x: 400, y: 400, w: 50, h: 50, text: '', color: '#fff' },
    )
    const inside = b.shapesInside('f')
    expect(inside.has('f2')).toBe(true)
    expect(inside.has('s3')).toBe(true) // found only via the nested frame
    expect(inside.has('sOut')).toBe(false)
    expect(inside.has('f')).toBe(false)
  })
})

describe('Board.reorderMany', () => {
  const mk = () => {
    const b = makeBoard()
    b.state.shapes.push(
      { id: 'a', type: 'rect', x: 0, y: 0, w: 10, h: 10, text: '', color: '#fff' },
      { id: 'b', type: 'rect', x: 0, y: 0, w: 10, h: 10, text: '', color: '#fff' },
      { id: 'c', type: 'rect', x: 0, y: 0, w: 10, h: 10, text: '', color: '#fff' },
    )
    return b
  }

  it('moves selected shapes to the front, preserving relative order', () => {
    const b = mk()
    b.reorderMany(new Set(['a', 'c']), 'front')
    expect(b.state.shapes.map((s) => s.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves selected shapes to the back, preserving relative order', () => {
    const b = mk()
    b.reorderMany(new Set(['b', 'c']), 'back')
    expect(b.state.shapes.map((s) => s.id)).toEqual(['b', 'c', 'a'])
  })
})
