// Unit tests for the pan/zoom viewport math.
import { describe, it, expect } from 'vitest'
import { Viewport } from './viewport'

function noop() {}

describe('Viewport transforms', () => {
  it('toScreen and toWorld are inverses', () => {
    const vp = new Viewport(noop)
    vp.x = 100
    vp.y = 50
    vp.zoom = 2
    const w = vp.toWorld(300, 200)
    expect(w).toEqual({ x: 100, y: 75 })
    const s = vp.toScreen(w.x, w.y)
    expect(s.x).toBeCloseTo(300)
    expect(s.y).toBeCloseTo(200)
  })

  it('pan shifts the viewport by the delta', () => {
    const vp = new Viewport(noop)
    vp.pan(30, -12)
    expect(vp.x).toBe(30)
    expect(vp.y).toBe(-12)
  })

  it('zoomAt keeps the point under the cursor stationary', () => {
    let updates = 0
    const vp = new Viewport(() => updates++)
    const sx = 320
    const sy = 180
    const before = vp.toWorld(sx, sy)
    vp.zoomAt(sx, sy, 1.5)
    const after = vp.toWorld(sx, sy)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
    expect(vp.zoom).toBeCloseTo(1.5)
    expect(updates).toBe(1)
  })

  it('clamps zoom to the [0.1, 8] range', () => {
    const vp = new Viewport(noop)
    vp.zoomAt(0, 0, 1000)
    expect(vp.zoom).toBe(8)
    vp.zoomAt(0, 0, 0.00001)
    expect(vp.zoom).toBe(0.1)
  })

  it('reset returns to the identity view', () => {
    const vp = new Viewport(noop)
    vp.pan(40, 60)
    vp.zoomAt(0, 0, 2)
    vp.reset()
    expect(vp.x).toBe(0)
    expect(vp.y).toBe(0)
    expect(vp.zoom).toBe(1)
  })

  it('cssTransform maps world coords to screen via translate + scale', () => {
    const vp = new Viewport(noop)
    expect(vp.cssTransform()).toBe('translate(0px, 0px) scale(1)')
    vp.pan(30, -12)
    vp.zoomAt(0, 0, 2)
    expect(vp.cssTransform()).toBe(`translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`)
    // a world point (10, 20) maps to (10*zoom + x, 20*zoom + y)
    const s = vp.toScreen(10, 20)
    expect(s.x).toBeCloseTo(10 * vp.zoom + vp.x)
    expect(s.y).toBeCloseTo(20 * vp.zoom + vp.y)
  })
})
