// Unit tests for the undo/redo snapshot stack.
import { describe, it, expect } from 'vitest'
import { History } from './history'
import type { BoardState } from './types'

function state(tag: string): BoardState {
  return { version: 1, shapes: [{ id: tag, type: 'text', x: 0, y: 0, w: 10, h: 10, text: '', color: '#fff' }], connectors: [] }
}

describe('History', () => {
  it('undo returns the previous snapshot and redo returns the current', () => {
    const h = new History()
    const empty: BoardState = { version: 1, shapes: [], connectors: [] }
    const one = state('one')
    h.push(empty) // baseline
    h.push(empty) // "before" snapshot taken before the first edit
    const back = h.undo(one)
    expect(back).toEqual(empty)
    expect(h.canRedo()).toBe(true)
    const fwd = h.redo(empty)
    expect(fwd).toEqual(one)
  })

  it('a new push clears the redo stack', () => {
    const h = new History()
    const empty: BoardState = { version: 1, shapes: [], connectors: [] }
    const one = state('one')
    h.push(empty)
    h.undo(one)
    expect(h.canRedo()).toBe(true)
    h.push(state('two'))
    expect(h.canRedo()).toBe(false)
  })

  it('caps the undo depth', () => {
    const h = new History(2)
    const empty: BoardState = { version: 1, shapes: [], connectors: [] }
    h.push(empty)
    h.push(state('a'))
    h.push(state('b'))
    // stack now holds [a, b]; baseline empty was evicted
    expect(h.undo(state('c'))).toEqual(state('b'))
    expect(h.undo(state('b'))).toEqual(state('a'))
    expect(h.undo(state('a'))).toBeNull()
  })

  it('reset drops all history and can re-baseline', () => {
    const h = new History()
    const empty: BoardState = { version: 1, shapes: [], connectors: [] }
    h.push(empty)
    h.push(state('a'))
    h.reset(state('fresh'))
    expect(h.canRedo()).toBe(false)
    expect(h.undo(state('current'))).toEqual(state('fresh'))
  })
})
