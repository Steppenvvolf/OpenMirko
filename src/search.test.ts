// Unit tests for text search.
import { describe, it, expect } from 'vitest'
import { searchShapes } from './search'
import type { BoardState } from './types'

const state: BoardState = {
  version: 1,
  shapes: [
    { id: 'a', type: 'sticky', x: 0, y: 0, w: 10, h: 10, text: 'Hello world', color: '#fff' },
    { id: 'b', type: 'rect', x: 0, y: 0, w: 10, h: 10, text: 'hello there', color: '#fff' },
    { id: 'c', type: 'rect', x: 0, y: 0, w: 10, h: 10, text: 'goodbye', color: '#fff' },
    { id: 'd', type: 'rect', x: 0, y: 0, w: 10, h: 10, text: '', color: '#fff' },
  ],
  connectors: [],
}

describe('searchShapes', () => {
  it('matches case-insensitive substring', () => {
    expect(searchShapes(state, 'hello').sort()).toEqual(['a', 'b'])
  })

  it('returns [] for empty or whitespace query', () => {
    expect(searchShapes(state, '')).toEqual([])
    expect(searchShapes(state, '   ')).toEqual([])
  })

  it('skips shapes with no text', () => {
    expect(searchShapes(state, 'goodbye')).toEqual(['c'])
    expect(searchShapes(state, 'xyz')).toEqual([])
  })
})
