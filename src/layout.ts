// Pure spatial-layout helpers: grid snap, align, and distribute.
// Kept free of DOM and board mutation so they are trivially unit-testable.
import type { Shape } from './types'

/** Round `n` to the nearest multiple of `grid` (snap). */
export function snapTo(n: number, grid: number): number {
  if (grid <= 0) return n
  return Math.round(n / grid) * grid
}

export type AlignAxis = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'

export interface Move {
  id: string
  x: number
  y: number
}

/**
 * Compute target positions that align every shape along one edge/axis of the
 * group's shared bounding box. Returns one move per input shape.
 */
export function alignShapes(shapes: Shape[], axis: AlignAxis): Move[] {
  if (shapes.length < 2) return []
  const minX = Math.min(...shapes.map((s) => s.x))
  const maxX = Math.max(...shapes.map((s) => s.x + s.w))
  const minY = Math.min(...shapes.map((s) => s.y))
  const maxY = Math.max(...shapes.map((s) => s.y + s.h))
  return shapes.map((s) => {
    const m: Move = { id: s.id, x: s.x, y: s.y }
    switch (axis) {
      case 'left':
        m.x = minX
        break
      case 'right':
        m.x = maxX - s.w
        break
      case 'center-x':
        m.x = (minX + maxX) / 2 - s.w / 2
        break
      case 'top':
        m.y = minY
        break
      case 'bottom':
        m.y = maxY - s.h
        break
      case 'center-y':
        m.y = (minY + maxY) / 2 - s.h / 2
        break
    }
    return m
  })
}

/**
 * Evenly distribute shapes between the first and last (by center position)
 * along one axis, preserving their order.
 */
export function distributeShapes(shapes: Shape[], axis: 'x' | 'y'): Move[] {
  if (shapes.length < 3) return []
  const center = (s: Shape) => (axis === 'x' ? s.x + s.w / 2 : s.y + s.h / 2)
  const sorted = [...shapes].sort((a, b) => center(a) - center(b))
  const first = center(sorted[0])
  const last = center(sorted[sorted.length - 1])
  const step = (last - first) / (sorted.length - 1)
  return sorted.map((s, i) => {
    const c = first + step * i
    return axis === 'x' ? { id: s.id, x: c - s.w / 2, y: s.y } : { id: s.id, x: s.x, y: c - s.h / 2 }
  })
}
