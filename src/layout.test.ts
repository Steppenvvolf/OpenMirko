// Unit tests for the pure layout helpers (snap / align / distribute).
import { describe, it, expect } from 'vitest'
import { snapTo, alignShapes, distributeShapes } from './layout'
import type { Shape } from './types'

function rect(id: string, x: number, y: number, w = 100, h = 100): Shape {
  return { id, type: 'rect', x, y, w, h, text: '', color: '#ffffff' }
}

describe('snapTo', () => {
  it('rounds to the nearest grid multiple', () => {
    expect(snapTo(0, 28)).toBe(0)
    expect(snapTo(10, 28)).toBe(0)
    expect(snapTo(15, 28)).toBe(28)
    expect(snapTo(100, 28)).toBe(112)
    expect(snapTo(42, 28)).toBe(56)
  })

  it('snaps negative coordinates too', () => {
    expect(snapTo(-15, 28)).toBe(-28)
  })

  it('returns the value unchanged when the grid is non-positive', () => {
    expect(snapTo(37, 0)).toBe(37)
    expect(snapTo(37, -5)).toBe(37)
  })
})

describe('alignShapes', () => {
  it('aligns shapes to the left edge of the group', () => {
    const moves = alignShapes([rect('a', 0, 0), rect('b', 50, 100)], 'left')
    expect(moves).toContainEqual({ id: 'a', x: 0, y: 0 })
    expect(moves).toContainEqual({ id: 'b', x: 0, y: 100 })
  })

  it('aligns shapes to the right edge of the shared bounding box', () => {
    // a right edge = 100, b right edge = 150 -> maxX = 150
    const moves = alignShapes([rect('a', 0, 0), rect('b', 50, 0)], 'right')
    expect(moves).toContainEqual({ id: 'a', x: 50, y: 0 })
    expect(moves).toContainEqual({ id: 'b', x: 50, y: 0 })
  })

  it('centers shapes on the horizontal center of the shared box', () => {
    // shared box: minX=0, maxX=250 -> center x = 125; each shape x = 125 - 50
    const moves = alignShapes([rect('a', 0, 0, 100, 100), rect('b', 150, 0, 100, 100)], 'center-x')
    expect(moves).toContainEqual({ id: 'a', x: 75, y: 0 })
    expect(moves).toContainEqual({ id: 'b', x: 75, y: 0 })
  })

  it('returns an empty array for fewer than two shapes', () => {
    expect(alignShapes([rect('a', 0, 0)], 'left')).toEqual([])
    expect(alignShapes([], 'left')).toEqual([])
  })
})

describe('distributeShapes', () => {
  it('keeps already-even shapes in place', () => {
    const moves = distributeShapes([rect('a', 0, 0), rect('b', 100, 0), rect('c', 200, 0)], 'x')
    expect(moves).toEqual([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 200, y: 0 },
    ])
  })

  it('spreads unevenly-spaced shapes evenly, preserving order', () => {
    // centers: a=50, b=60, c=250 -> targets 50, 150, 250
    const moves = distributeShapes([rect('a', 0, 0), rect('b', 10, 5), rect('c', 200, 0)], 'x')
    expect(moves).toEqual([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 5 },
      { id: 'c', x: 200, y: 0 },
    ])
  })

  it('requires at least three shapes', () => {
    expect(distributeShapes([rect('a', 0, 0), rect('b', 100, 0)], 'x')).toEqual([])
  })
})
