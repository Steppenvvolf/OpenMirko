// Unit tests for starter templates.
import { describe, it, expect } from 'vitest'
import { templates } from './templates'
import { defaultBorderWidth } from './types'

describe('templates', () => {
  it('exposes blank, mind map, flowchart, and kanban templates', () => {
    expect(templates.map((t) => t.id).sort()).toEqual(['blank', 'flowchart', 'kanban', 'mindmap'])
  })

  it('every template builds a valid board state', () => {
    for (const t of templates) {
      const b = t.build()
      expect(Array.isArray(b.shapes)).toBe(true)
      expect(Array.isArray(b.connectors)).toBe(true)
      // connectors reference existing shapes
      for (const c of b.connectors) {
        expect(b.shapes.some((s) => s.id === c.fromId)).toBe(true)
        expect(b.shapes.some((s) => s.id === c.toId)).toBe(true)
      }
    }
  })

  it('the mind map template has a root with branches', () => {
    const b = templates.find((t) => t.id === 'mindmap')!.build()
    expect(b.shapes.map((s) => s.id)).toContain('root')
    expect(b.connectors.length).toBeGreaterThanOrEqual(3)
  })
})

describe('defaultBorderWidth', () => {
  it('returns 2 for bordered shapes and 0 otherwise', () => {
    expect(defaultBorderWidth('rect')).toBe(2)
    expect(defaultBorderWidth('ellipse')).toBe(2)
    expect(defaultBorderWidth('frame')).toBe(2)
    expect(defaultBorderWidth('sticky')).toBe(0)
    expect(defaultBorderWidth('diamond')).toBe(0)
    expect(defaultBorderWidth('text')).toBe(0)
  })
})
