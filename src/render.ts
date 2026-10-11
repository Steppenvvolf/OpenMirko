// Rendering: DOM elements for shapes (inside the transformed canvas) and
// an SVG layer for connectors (screen space, so strokes stay crisp).

import type { Board } from './board'
import type { Connector, Shape } from './types'
import type { Viewport } from './viewport'

const NS = 'http://www.w3.org/2000/svg'

export class Renderer {
  private shapeEls = new Map<string, HTMLElement>()
  private connEls = new Map<string, SVGGElement>()

  constructor(
    private canvas: HTMLElement,
    private svg: SVGSVGElement,
    private board: Board,
    private viewport: Viewport,
    private getSelection: () => Set<string>,
  ) {}

  renderAll(): void {
    // The canvas holds shapes in world coordinates; apply the viewport
    // transform so they pan/zoom together with connectors and handles.
    this.canvas.style.transform = this.viewport.cssTransform()
    this.renderShapes()
    this.renderConnectors()
  }

  renderShapes(): void {
    const seen = new Set<string>()
    for (const s of this.board.state.shapes) {
      seen.add(s.id)
      const el = this.ensureShape(s)
      this.applyShape(s, el)
      el.classList.toggle('selected', this.getSelection().has(s.id))
    }
    // prune removed shapes
    for (const [id, el] of this.shapeEls) {
      if (!seen.has(id)) {
        el.remove()
        this.shapeEls.delete(id)
      }
    }
  }

  private ensureShape(s: Shape): HTMLElement {
    let el = this.shapeEls.get(s.id)
    if (!el) {
      el = document.createElement('div')
      el.className = `shape shape-${s.type}`
      el.dataset.id = s.id
      el.innerHTML = s.type === 'pen' ? `<svg class="pen-svg"><path class="pen-path"></path></svg>` : `<div class="shape-body"></div>`
      this.canvas.appendChild(el)
      this.shapeEls.set(s.id, el)
    }
    return el
  }

  private applyShape(s: Shape, el: HTMLElement): void {
    el.style.transform = `translate(${s.x}px, ${s.y}px)`
    el.style.width = `${s.w}px`
    el.style.height = `${s.h}px`
    el.style.setProperty('--shape-color', s.color)
    if (s.type === 'pen') {
      this.applyPen(s, el)
    } else {
      const body = el.firstElementChild as HTMLElement
      body.textContent = s.text || ''
    }
  }

  private applyPen(s: Shape, el: HTMLElement): void {
    const path = el.querySelector('.pen-path') as SVGPathElement | null
    if (!path || !s.points || s.points.length === 0) return
    const width = s.strokeWidth ?? 2.5
    if (s.points.length === 1) {
      // a single click -> a small dot centered in the bounding box
      const r = Math.max(width, 2.5)
      const cx = s.w / 2
      const cy = s.h / 2
      path.setAttribute('d', `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0 Z`)
      path.setAttribute('fill', s.color)
      path.setAttribute('stroke', 'none')
      path.setAttribute('stroke-width', '0')
    } else {
      const d = 'M ' + s.points.map((p) => `${p.x - s.x},${p.y - s.y}`).join(' L ')
      path.setAttribute('d', d)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', s.color)
      path.setAttribute('stroke-width', String(width))
    }
  }

  renderConnectors(): void {
    const seen = new Set<string>()
    for (const c of this.board.state.connectors) {
      const ends = this.board.connectorEndpoints(c)
      if (!ends) continue
      seen.add(c.id)
      const g = this.ensureConnector(c)
      this.applyConnector(c, ends, g)
      g.classList.toggle('selected', this.getSelection().has(c.id))
    }
    for (const [id, g] of this.connEls) {
      if (!seen.has(id)) {
        g.remove()
        this.connEls.delete(id)
      }
    }
  }

  private ensureConnector(c: Connector): SVGGElement {
    let g = this.connEls.get(c.id)
    if (!g) {
      g = document.createElementNS(NS, 'g') as SVGGElement
      g.dataset.id = c.id
      g.classList.add('connector')
      const line = document.createElementNS(NS, 'line')
      line.setAttribute('stroke', c.color)
      line.setAttribute('stroke-width', '2.5')
      line.setAttribute('stroke-linecap', 'round')
      const head = document.createElementNS(NS, 'polygon')
      head.setAttribute('fill', c.color)
      g.append(line, head)
      this.svg.appendChild(g)
      this.connEls.set(c.id, g)
    }
    return g
  }

  private applyConnector(
    c: Connector,
    ends: { x1: number; y1: number; x2: number; y2: number },
    g: SVGGElement,
  ): void {
    const a = this.viewport.toScreen(ends.x1, ends.y1)
    const b = this.viewport.toScreen(ends.x2, ends.y2)
    const line = g.firstElementChild as SVGLineElement
    line.setAttribute('x1', String(a.x))
    line.setAttribute('y1', String(a.y))
    line.setAttribute('x2', String(b.x))
    line.setAttribute('y2', String(b.y))

    const head = g.lastElementChild as SVGPolygonElement
    if (c.kind === 'arrow') {
      const size = 9
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      const p1 = { x: b.x, y: b.y }
      const p2 = { x: b.x - size * Math.cos(ang - Math.PI / 6), y: b.y - size * Math.sin(ang - Math.PI / 6) }
      const p3 = { x: b.x - size * Math.cos(ang + Math.PI / 6), y: b.y - size * Math.sin(ang + Math.PI / 6) }
      head.setAttribute('points', `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`)
      head.style.display = ''
    } else {
      head.style.display = 'none'
    }
  }

  shapeEl(id: string): HTMLElement | undefined {
    return this.shapeEls.get(id)
  }

  connEl(id: string): SVGGElement | undefined {
    return this.connEls.get(id)
  }
}
