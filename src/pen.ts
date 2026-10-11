// Pure geometry helpers for pen strokes (polylines). Kept free of DOM and
// board mutation so they are trivially unit-testable.
export interface Pt {
  x: number
  y: number
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Bounding box of a set of points, floored to a minimum size so tiny strokes
 *  (single dots) still have a usable hit area. */
export function penBounds(points: Pt[], minSize = 12): Box {
  if (points.length === 0) return { x: 0, y: 0, w: minSize, h: minSize }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const w = Math.max(maxX - minX, minSize)
  const h = Math.max(maxY - minY, minSize)
  return { x: minX, y: minY, w, h }
}

/** Translate every point by (dx, dy). Returns a new array. */
export function translatePoints(points: Pt[], dx: number, dy: number): Pt[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

/** Scale points from a source box to a destination box. Returns a new array. */
export function scalePoints(points: Pt[], src: Box, dst: Box): Pt[] {
  const sx = dst.w / src.w
  const sy = dst.h / src.h
  return points.map((p) => ({ x: dst.x + (p.x - src.x) * sx, y: dst.y + (p.y - src.y) * sy }))
}
