// Unit tests for the pure SVG export.
import { describe, it, expect } from 'vitest'
import { toSVG, boardBounds } from './export'
import type { BoardState, Connector, Shape } from './types'

function board(shapes: Shape[], connectors: Connector[] = []): BoardState {
  return { version: 1, shapes, connectors }
}

describe('boardBounds', () => {
  it('returns the union of all shape bounds', () => {
    const b = boardBounds(board([
      { id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50, text: '', color: '#fff' },
      { id: 'b', type: 'rect', x: 200, y: 100, w: 50, h: 50, text: '', color: '#fff' },
    ]))
    expect(b).toEqual({ minX: 0, minY: 0, maxX: 250, maxY: 150 })
  })

  it('returns null for an empty board', () => {
    expect(boardBounds(board([]))).toBeNull()
  })
})

describe('toSVG', () => {
  it('produces an svg with a correct viewBox covering all shapes', () => {
    const svg = toSVG(board([
      { id: 'a', type: 'rect', x: 100, y: 100, w: 200, h: 100, text: 'hi', color: '#ffffff' },
    ]))
    expect(svg.startsWith('<svg xmlns=')).toBe(true)
    // PAD = 24: x = 100-24 = 76, w = 200+48 = 248, h = 100+48 = 148
    expect(svg).toContain('viewBox="76 76 248 148"')
    expect(svg).toContain('<rect')
    expect(svg).toContain('>hi</tspan>')
  })

  it('escapes XML special characters in text', () => {
    const svg = toSVG(board([
      { id: 'a', type: 'text', x: 0, y: 0, w: 100, h: 30, text: 'a < b & "c"', color: 'transparent', fontSize: 20 },
    ]))
    expect(svg).toContain('a &lt; b &amp; &quot;c&quot;')
  })

  it('renders ellipse, polygon, and pen shapes', () => {
    const svg = toSVG(board([
      { id: 'e', type: 'ellipse', x: 0, y: 0, w: 100, h: 60, text: '', color: '#fff' },
      { id: 'd', type: 'diamond', x: 0, y: 0, w: 100, h: 100, text: '', color: '#fff' },
      { id: 'p', type: 'pen', x: 0, y: 0, w: 10, h: 10, text: '', color: '#000', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], strokeWidth: 3 },
    ]))
    expect(svg).toContain('<ellipse')
    expect(svg).toContain('<polygon')
    expect(svg).toContain('<path d="M 0,0 L 10,10"')
  })

  it('renders connectors with arrowheads', () => {
    const svg = toSVG(board(
      [
        { id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 100, text: '', color: '#fff' },
        { id: 'b', type: 'rect', x: 200, y: 0, w: 100, h: 100, text: '', color: '#fff' },
      ],
      [{ id: 'c', kind: 'arrow', fromId: 'a', toId: 'b', color: '#64748B' }],
    ))
    expect(svg).toContain('<line')
    expect(svg).toContain('<polygon') // arrowhead
  })
})
