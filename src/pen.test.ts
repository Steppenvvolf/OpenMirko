// Unit tests for pen stroke geometry helpers.
import { describe, it, expect } from 'vitest'
import { penBounds, translatePoints, scalePoints } from './pen'

describe('penBounds', () => {
  it('returns the bounding box of the points', () => {
    const b = penBounds([
      { x: 10, y: 20 },
      { x: 50, y: 80 },
      { x: 30, y: 40 },
    ])
    expect(b).toEqual({ x: 10, y: 20, w: 40, h: 60 })
  })

  it('floors tiny strokes to a minimum size', () => {
    expect(penBounds([{ x: 100, y: 100 }])).toEqual({ x: 100, y: 100, w: 12, h: 12 })
  })

  it('handles empty points', () => {
    expect(penBounds([])).toEqual({ x: 0, y: 0, w: 12, h: 12 })
  })
})

describe('translatePoints', () => {
  it('translates every point without mutating the source', () => {
    const src = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]
    const out = translatePoints(src, 10, -5)
    expect(out).toEqual([
      { x: 11, y: -3 },
      { x: 13, y: -1 },
    ])
    expect(src).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
  })
})

describe('scalePoints', () => {
  it('scales points from the source box to the destination box', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]
    const out = scalePoints(pts, { x: 0, y: 0, w: 100, h: 100 }, { x: 10, y: 20, w: 200, h: 50 })
    expect(out).toEqual([
      { x: 10, y: 20 },
      { x: 210, y: 70 },
    ])
  })
})
