// Unit tests for mind-map auto-layout.
import { describe, it, expect } from 'vitest'
import { mindMapLayout } from './mindmap'
import type { Connector, Shape } from './types'

function rect(id: string, x: number, y: number): Shape {
  return { id, type: 'rect', x, y, w: 50, h: 50, text: '', color: '#fff' }
}
function conn(id: string, fromId: string, toId: string): Connector {
  return { id, kind: 'arrow', fromId, toId, color: '#000' }
}

describe('mindMapLayout', () => {
  it('lays out a tree rooted at the given node', () => {
    const shapes = [rect('r', 100, 100), rect('a', 0, 0), rect('b', 0, 0), rect('a1', 0, 0), rect('a2', 0, 0)]
    const connectors = [conn('c1', 'r', 'a'), conn('c2', 'r', 'b'), conn('c3', 'a', 'a1'), conn('c4', 'a', 'a2')]
    const pos = mindMapLayout(shapes, connectors, 'r')
    const map = new Map(pos.map((p) => [p.id, p]))

    // root stays anchored at its original position
    expect(map.get('r')).toEqual({ id: 'r', x: 100, y: 100 + 1.25 * 140 })
    // children are to the right of the root
    expect(map.get('a')!.x).toBeGreaterThan(100)
    expect(map.get('b')!.x).toBe(map.get('a')!.x)
    // grandchildren are further right
    expect(map.get('a1')!.x).toBeGreaterThan(map.get('a')!.x)
    // all five nodes are positioned
    expect(pos).toHaveLength(5)
  })

  it('anchors the root at its current x,y', () => {
    const shapes = [rect('r', 300, 200), rect('a', 0, 0)]
    const pos = mindMapLayout(shapes, [conn('c', 'r', 'a')], 'r')
    expect(pos.find((p) => p.id === 'r')!.x).toBe(300)
    expect(pos.find((p) => p.id === 'r')!.y).toBe(200)
  })

  it('returns [] for an unknown root', () => {
    expect(mindMapLayout([rect('a', 0, 0)], [], 'nope')).toEqual([])
  })

  it('leaves disconnected shapes out of the result', () => {
    const shapes = [rect('r', 0, 0), rect('a', 0, 0), rect('loner', 0, 0)]
    const pos = mindMapLayout(shapes, [conn('c', 'r', 'a')], 'r')
    expect(pos.map((p) => p.id).sort()).toEqual(['a', 'r'])
  })
})
