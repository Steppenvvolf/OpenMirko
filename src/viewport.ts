// Pan/zoom viewport with world <-> screen transforms.

export interface Point {
  x: number
  y: number
}

export class Viewport {
  x = 0 // screen offset of world origin
  y = 0
  zoom = 1

  constructor(private onUpdate: () => void) {}

  toScreen(wx: number, wy: number): Point {
    return { x: wx * this.zoom + this.x, y: wy * this.zoom + this.y }
  }

  toWorld(sx: number, sy: number): Point {
    return { x: (sx - this.x) / this.zoom, y: (sy - this.y) / this.zoom }
  }

  pan(dx: number, dy: number): void {
    this.x += dx
    this.y += dy
    this.onUpdate()
  }

  zoomAt(sx: number, sy: number, factor: number): void {
    const before = this.toWorld(sx, sy)
    this.zoom = clamp(this.zoom * factor, 0.1, 8)
    const after = this.toWorld(sx, sy)
    // keep the point under the cursor stationary
    this.x += (after.x - before.x) * this.zoom
    this.y += (after.y - before.y) * this.zoom
    this.onUpdate()
  }

  reset(): void {
    this.x = 0
    this.y = 0
    this.zoom = 1
    this.onUpdate()
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
