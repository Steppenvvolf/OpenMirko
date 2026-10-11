// The editor: tool state, selection, and all pointer/keyboard interaction.

import { Board } from './board'
import { History } from './history'
import { alignShapes, distributeShapes, snapTo } from './layout'
import type { AlignAxis } from './layout'
import { penBounds, scalePoints, translatePoints } from './pen'
import { mindMapLayout } from './mindmap'
import { Renderer } from './render'
import * as persist from './persist'
import { searchShapes } from './search'
import type { BoardState, Connector, Shape, ShapeType, Tool } from './types'
import { DEFAULT_FONT_SIZE, GRID, MIN_SIZE, defaultBorderWidth } from './types'
import { Viewport } from './viewport'

type DragMode = 'pan' | 'move' | 'resize' | 'marquee' | 'draw' | 'measure'
type Handle = 'nw' | 'ne' | 'sw' | 'se'

interface OrigBox {
  x: number
  y: number
  w: number
  h: number
  points?: { x: number; y: number }[]
}

interface DragState {
  mode: DragMode
  startSX: number
  startSY: number
  lastSX: number
  lastSY: number
  moved: boolean
  created: boolean
  handle?: Handle
  orig: Map<string, OrigBox>
  contained: Map<string, OrigBox>
  before: BoardState | null
}

const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  s: 'sticky',
  r: 'rect',
  o: 'ellipse',
  d: 'diamond',
  y: 'triangle',
  h: 'hexagon',
  a: 'star',
  l: 'cloud',
  p: 'pen',
  f: 'frame',
  m: 'ruler',
  t: 'text',
  c: 'connector',
}

export class Editor {
  board: Board
  viewport: Viewport
  renderer: Renderer
  history = new History()
  tool: Tool = 'select'
  selection = new Set<string>()

  private spaceHeld = false
  private connectorSource: string | null = null
  private drag: DragState | null = null
  private clipboard: { shapes: Shape[]; connectors: Connector[] } | null = null
  snapEnabled = false
  searchMatches = new Set<string>()
  boardId = ''

  constructor(
    private viewportEl: HTMLElement,
    canvasEl: HTMLElement,
    svgEl: SVGSVGElement,
    private handlesEl: HTMLElement,
    private marqueeEl: HTMLElement,
    initial: BoardState,
  ) {
    this.board = new Board(initial)
    this.viewport = new Viewport(() => this.refresh())
    this.renderer = new Renderer(canvasEl, svgEl, this.board, this.viewport, () => this.selection)
    this.history.push(this.board.clone()) // baseline so the first undo returns to empty
    this.bindEvents()
    this.commit()
  }

  // ---- rendering helpers ---------------------------------------------------

  private refresh(): void {
    this.renderer.renderAll()
    this.updateHandles()
    this.syncGrid()
    this.updateContextBar()
  }

  private commit(): void {
    this.refresh()
    persist.saveBoard(this.boardId, this.board.clone())
  }

  private syncGrid(): void {
    const size = 28 * this.viewport.zoom
    this.viewportEl.style.backgroundSize = `${size}px ${size}px`
    this.viewportEl.style.backgroundPosition = `${this.viewport.x}px ${this.viewport.y}px`
  }

  private updateHandles(): void {
    this.handlesEl.innerHTML = ''
    if (this.selection.size !== 1) return
    const id = [...this.selection][0]
    const shape = this.board.shape(id)
    if (!shape) return
    const tl = this.viewport.toScreen(shape.x, shape.y)
    const br = this.viewport.toScreen(shape.x + shape.w, shape.y + shape.h)
    const corners: [Handle, number, number][] = [
      ['nw', tl.x, tl.y],
      ['ne', br.x, tl.y],
      ['sw', tl.x, br.y],
      ['se', br.x, br.y],
    ]
    for (const [h, x, y] of corners) {
      const el = document.createElement('div')
      el.className = 'handle'
      el.dataset.handle = h
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      this.handlesEl.appendChild(el)
    }
  }

  // ---- selection -----------------------------------------------------------

  private selectOnly(id: string): void {
    this.selection.clear()
    this.selection.add(id)
    this.refresh()
  }

  private toggleSelect(id: string): void {
    if (this.selection.has(id)) this.selection.delete(id)
    else this.selection.add(id)
    this.refresh()
  }

  clearSelection(): void {
    this.selection.clear()
    this.connectorSource = null
    this.refresh()
  }

  // ---- selection helpers ---------------------------------------------------

  private selectedShapes(): Shape[] {
    const shapes: Shape[] = []
    for (const id of this.selection) {
      const s = this.board.shape(id)
      if (s) shapes.push(s)
    }
    return shapes
  }

  selectAll(): void {
    this.selection = new Set([
      ...this.board.state.shapes.map((s) => s.id),
      ...this.board.state.connectors.map((c) => c.id),
    ])
    this.refresh()
  }

  /** Highlight shapes whose text matches the query. */
  search(query: string): void {
    this.searchMatches = new Set(query.trim() ? searchShapes(this.board.state, query) : [])
    for (const s of this.board.state.shapes) {
      this.renderer.shapeEl(s.id)?.classList.toggle('search-match', this.searchMatches.has(s.id))
    }
  }

  // ---- clipboard -----------------------------------------------------------

  copySelected(): void {
    if (this.selection.size === 0) return
    this.clipboard = this.board.copySelection(this.selection)
  }

  cutSelected(): void {
    if (this.selection.size === 0) return
    this.copySelected()
    this.deleteSelected()
  }

  paste(): void {
    if (!this.clipboard) return
    this.history.push(this.board.clone())
    const { shapeIds } = this.board.pasteSubgraph(this.clipboard, 24, 24)
    this.selection = new Set(shapeIds)
    this.commit()
  }

  // ---- layout (align / distribute) -----------------------------------------

  align(axis: AlignAxis): void {
    const moves = alignShapes(this.selectedShapes(), axis)
    if (!moves.length) return
    this.history.push(this.board.clone())
    for (const m of moves) {
      const s = this.board.shape(m.id)
      if (s) {
        s.x = m.x
        s.y = m.y
      }
    }
    this.commit()
  }

  distribute(axis: 'x' | 'y'): void {
    const moves = distributeShapes(this.selectedShapes(), axis)
    if (!moves.length) return
    this.history.push(this.board.clone())
    for (const m of moves) {
      const s = this.board.shape(m.id)
      if (s) {
        s.x = m.x
        s.y = m.y
      }
    }
    this.commit()
  }

  /** Auto-arrange the board (or selected subgraph) as a horizontal mind map. */
  mindMap(): void {
    const shapes = this.board.state.shapes
    if (shapes.length === 0) return
    let rootId: string
    const selected = this.selectedShapes()
    if (selected.length > 0) {
      rootId = selected[0].id
    } else {
      const incoming = new Set(this.board.state.connectors.map((c) => c.toId))
      rootId = (shapes.find((s) => !incoming.has(s.id)) ?? shapes[0]).id
    }
    const positions = mindMapLayout(shapes, this.board.state.connectors, rootId)
    if (!positions.length) return
    this.history.push(this.board.clone())
    for (const p of positions) {
      const s = this.board.shape(p.id)
      if (!s) continue
      if (s.points) {
        const dx = p.x - s.x
        const dy = p.y - s.y
        s.points = translatePoints(s.points, dx, dy)
        const b = penBounds(s.points)
        s.x = b.x
        s.y = b.y
        s.w = b.w
        s.h = b.h
      } else {
        s.x = p.x
        s.y = p.y
      }
    }
    this.commit()
  }

  // ---- appearance ----------------------------------------------------------

  setColor(color: string): void {
    const shapes = this.selectedShapes()
    if (!shapes.length) return
    this.history.push(this.board.clone())
    for (const s of shapes) s.color = color
    this.commit()
  }

  setFontSize(delta: number): void {
    const shapes = this.selectedShapes()
    if (!shapes.length) return
    this.history.push(this.board.clone())
    for (const s of shapes) s.fontSize = Math.max(8, Math.min(96, (s.fontSize ?? DEFAULT_FONT_SIZE) + delta))
    this.commit()
  }

  setBorderWidth(delta: number): void {
    const shapes = this.selectedShapes()
    if (!shapes.length) return
    this.history.push(this.board.clone())
    for (const s of shapes) {
      const cur = s.borderWidth ?? defaultBorderWidth(s.type)
      s.borderWidth = Math.max(0, Math.min(4, cur + delta))
    }
    this.commit()
  }

  bringFront(): void {
    if (this.selection.size === 0) return
    this.history.push(this.board.clone())
    this.board.reorderMany(this.selection, 'front')
    this.commit()
  }

  sendBack(): void {
    if (this.selection.size === 0) return
    this.history.push(this.board.clone())
    this.board.reorderMany(this.selection, 'back')
    this.commit()
  }

  private nudge(dx: number, dy: number): void {
    const shapes = this.selectedShapes()
    if (!shapes.length) return
    this.history.push(this.board.clone())
    for (const s of shapes) {
      if (s.points) {
        s.points = translatePoints(s.points, dx, dy)
        const b = penBounds(s.points)
        s.x = b.x
        s.y = b.y
        s.w = b.w
        s.h = b.h
      } else {
        s.x += dx
        s.y += dy
      }
    }
    this.commit()
  }

  setSnap(enabled: boolean): void {
    this.snapEnabled = enabled
    this.updateContextBar()
  }

  // ---- board lifecycle -----------------------------------------------------

  clearBoard(): void {
    this.board.replace(persist.emptyBoard())
    this.selection.clear()
    this.clipboard = null
    this.connectorSource = null
    this.history.reset(this.board.clone())
    this.commit()
  }

  // ---- contextual toolbar --------------------------------------------------

  private updateContextBar(): void {
    const bar = document.getElementById('contextbar')
    if (!bar) return
    const shapes = this.selectedShapes()
    bar.hidden = shapes.length === 0
    const arrange = bar.querySelector('.cb-arrange') as HTMLElement | null
    if (arrange) arrange.style.display = shapes.length >= 2 ? '' : 'none'
    const snapBtn = bar.querySelector('#cb-snap') as HTMLElement | null
    snapBtn?.classList.toggle('active', this.snapEnabled)
  }

  // ---- mutations (with history) -------------------------------------------

  private deleteSelected(): void {
    if (this.selection.size === 0) return
    this.history.push(this.board.clone())
    this.board.removeMany(new Set(this.selection))
    this.selection.clear()
    this.commit()
  }

  private duplicateSelected(): void {
    if (this.selection.size === 0) return
    this.history.push(this.board.clone())
    const sub = this.board.copySelection(this.selection)
    const { shapeIds } = this.board.pasteSubgraph(sub, 24, 24)
    this.selection = new Set(shapeIds)
    this.commit()
  }

  undo(): void {
    const prev = this.history.undo(this.board.clone())
    if (!prev) return
    this.board.replace(prev)
    this.selection.clear()
    this.commit()
  }

  redo(): void {
    const next = this.history.redo(this.board.clone())
    if (!next) return
    this.board.replace(next)
    this.selection.clear()
    this.commit()
  }

  loadState(state: BoardState): void {
    this.board.replace(state)
    this.selection.clear()
    // Reset (not just push) so undo cannot cross the import boundary.
    this.history.reset(state)
    this.commit()
  }

  // ---- pointer events ------------------------------------------------------

  private bindEvents(): void {
    this.viewportEl.addEventListener('pointerdown', (e) => this.onPointerDown(e))
    this.viewportEl.addEventListener('pointermove', (e) => this.onPointerMove(e))
    this.viewportEl.addEventListener('pointerup', (e) => this.onPointerUp(e))
    this.viewportEl.addEventListener('pointercancel', (e) => this.onPointerUp(e))
    this.viewportEl.addEventListener('wheel', (e) => this.onWheel(e), { passive: false })
    this.viewportEl.addEventListener('dblclick', (e) => this.onDoubleClick(e))
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  private localPoint(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const r = this.viewportEl.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button === 1 || (e.button === 0 && this.spaceHeld)) {
      this.startDrag('pan', e)
      return
    }
    if (e.button !== 0) return

    if (this.tool === 'ruler') {
      this.startDrag('measure', e)
      return
    }

    const target = e.target as HTMLElement

    const handleEl = target.closest('.handle') as HTMLElement | null
    if (handleEl) {
      const id = [...this.selection][0]
      if (id) this.startDrag('resize', e, false, handleEl.dataset.handle as Handle)
      return
    }

    const connEl = target.closest('g.connector') as SVGGElement | null
    if (connEl) {
      this.selectOnly(connEl.dataset.id!)
      return
    }

    const shapeEl = target.closest('.shape') as HTMLElement | null
    if (shapeEl) {
      this.onShapeDown(shapeEl.dataset.id!, e)
      return
    }

    this.onEmptyDown(e)
  }

  private onShapeDown(id: string, e: PointerEvent): void {
    if (this.tool === 'connector') {
      if (!this.connectorSource) {
        this.connectorSource = id
        this.selectOnly(id)
        return
      }
      const from = this.connectorSource
      this.connectorSource = null
      if (from !== id) {
        this.history.push(this.board.clone())
        this.board.addConnector(from, id)
        this.selection.clear()
        this.commit()
      }
      return
    }

    if (e.shiftKey) this.toggleSelect(id)
    else if (!this.selection.has(id)) this.selectOnly(id)

    this.startDrag('move', e, false)
  }

  private onEmptyDown(e: PointerEvent): void {
    if (this.tool === 'select') {
      if (!e.shiftKey) {
        this.selection.clear()
        this.refresh()
      }
      this.startDrag('marquee', e)
      return
    }
    if (this.tool === 'connector') {
      this.connectorSource = null
      this.selection.clear()
      this.refresh()
      return
    }
    if (this.tool === 'pen') {
      const p = this.localPoint(e)
      const w = this.viewport.toWorld(p.x, p.y)
      const before = this.board.clone()
      const shape = this.board.addShape('pen', w.x, w.y)
      this.selection.clear()
      this.selection.add(shape.id)
      this.startDrag('draw', e, true, undefined, before)
      return
    }
    // shape tool: create and immediately drag
    const p = this.localPoint(e)
    const w = this.viewport.toWorld(p.x, p.y)
    const before = this.board.clone() // snapshot BEFORE the shape exists
    const shape = this.board.addShape(this.tool as ShapeType, w.x, w.y)
    this.selection.clear()
    this.selection.add(shape.id)
    this.startDrag('move', e, true, undefined, before)
  }

  private startDrag(mode: DragMode, e: PointerEvent, created = false, handle?: Handle, before?: BoardState): void {
    const p = this.localPoint(e)
    const orig = new Map<string, OrigBox>()
    for (const id of this.selection) {
      const s = this.board.shape(id)
      if (s) orig.set(id, this.captureOrig(s))
    }
    // When moving frames, also capture shapes contained inside them so the
    // whole group moves together (contained shapes are not added to selection).
    const contained = new Map<string, OrigBox>()
    if (mode === 'move') {
      for (const id of orig.keys()) {
        const s = this.board.shape(id)
        if (s && s.type === 'frame') {
          for (const cid of this.board.shapesInside(id)) {
            if (orig.has(cid) || contained.has(cid)) continue
            const cs = this.board.shape(cid)
            if (cs) contained.set(cid, this.captureOrig(cs))
          }
        }
      }
    }
    this.drag = {
      mode,
      startSX: p.x,
      startSY: p.y,
      lastSX: p.x,
      lastSY: p.y,
      moved: false,
      created,
      handle,
      orig,
      contained,
      before: before ?? this.board.clone(),
    }
    try {
      this.viewportEl.setPointerCapture(e.pointerId)
    } catch {
      // Pointer capture can fail (synthetic events, a released pointer). The
      // drag still works because pointermove/up are handled on the viewport.
    }
  }

  private captureOrig(s: Shape): OrigBox {
    return { x: s.x, y: s.y, w: s.w, h: s.h, points: s.points ? s.points.map((p) => ({ ...p })) : undefined }
  }

  private moveShape(id: string, o: OrigBox, dw: number, dh: number): void {
    const s = this.board.shape(id)
    if (!s) return
    let nx = o.x + dw
    let ny = o.y + dh
    if (this.snapEnabled) {
      nx = snapTo(nx, GRID)
      ny = snapTo(ny, GRID)
    }
    if (s.points && o.points) {
      s.points = translatePoints(o.points, nx - o.x, ny - o.y)
      const b = penBounds(s.points)
      s.x = b.x
      s.y = b.y
      s.w = b.w
      s.h = b.h
    } else {
      s.x = nx
      s.y = ny
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drag) return
    const p = this.localPoint(e)
    const dxS = p.x - this.drag.lastSX
    const dyS = p.y - this.drag.lastSY
    const totalDX = p.x - this.drag.startSX
    const totalDY = p.y - this.drag.startSY
    this.drag.lastSX = p.x
    this.drag.lastSY = p.y
    if (Math.abs(totalDX) > 2 || Math.abs(totalDY) > 2) this.drag.moved = true

    switch (this.drag.mode) {
      case 'pan':
        this.viewport.pan(dxS, dyS)
        break
      case 'move': {
        const dw = totalDX / this.viewport.zoom
        const dh = totalDY / this.viewport.zoom
        for (const [id, o] of this.drag.orig) this.moveShape(id, o, dw, dh)
        for (const [id, o] of this.drag.contained) this.moveShape(id, o, dw, dh)
        this.refresh()
        break
      }
      case 'resize': {
        const dw = totalDX / this.viewport.zoom
        const dh = totalDY / this.viewport.zoom
        for (const [id, o] of this.drag.orig) {
          const s = this.board.shape(id)
          if (!s) continue
          const h = this.drag.handle!
          let x = o.x
          let y = o.y
          let nw = o.w
          let nh = o.h
          if (h === 'se' || h === 'ne') nw = o.w + dw
          if (h === 'sw' || h === 'nw') {
            nw = o.w - dw
            x = o.x + dw
          }
          if (h === 'se' || h === 'sw') nh = o.h + dh
          if (h === 'ne' || h === 'nw') {
            nh = o.h - dh
            y = o.y + dh
          }
          // clamp to minimum size, keeping the anchored corner fixed
          if (nw < MIN_SIZE) {
            if (h === 'sw' || h === 'nw') x = o.x + o.w - MIN_SIZE
            nw = MIN_SIZE
          }
          if (nh < MIN_SIZE) {
            if (h === 'ne' || h === 'nw') y = o.y + o.h - MIN_SIZE
            nh = MIN_SIZE
          }
          if (s.points && o.points) {
            s.points = scalePoints(o.points, { x: o.x, y: o.y, w: o.w, h: o.h }, { x, y, w: nw, h: nh })
          }
          s.x = x
          s.y = y
          s.w = nw
          s.h = nh
        }
        this.refresh()
        break
      }
      case 'draw': {
        const w = this.viewport.toWorld(p.x, p.y)
        for (const id of this.drag.orig.keys()) {
          const s = this.board.shape(id)
          if (!s || !s.points) continue
          const last = s.points[s.points.length - 1]
          if (!last || Math.hypot(w.x - last.x, w.y - last.y) > 2) {
            s.points.push({ x: w.x, y: w.y })
            const b = penBounds(s.points)
            s.x = b.x
            s.y = b.y
            s.w = b.w
            s.h = b.h
          }
        }
        this.drag.moved = true
        this.refresh()
        break
      }
      case 'measure': {
        const start = this.viewport.toWorld(this.drag.startSX, this.drag.startSY)
        const cur = this.viewport.toWorld(p.x, p.y)
        this.updateMeasure(start, cur)
        break
      }
      case 'marquee': {
        this.drawMarquee(this.drag.startSX, this.drag.startSY, p.x, p.y)
        break
      }
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    if (!this.drag) return
    const drag = this.drag
    this.drag = null

    if (drag.mode === 'marquee') {
      this.marqueeEl.style.display = 'none'
      this.applyMarqueeSelection(drag.startSX, drag.startSY, drag.lastSX, drag.lastSY)
      return
    }

    // measurement is transient and leaves no board change
    if (drag.mode === 'measure') return

    // push history for move/resize only if something actually changed,
    // or always for a created shape
    if (drag.before && (drag.created || drag.moved)) {
      this.history.push(drag.before)
    }
    this.commit()
  }

  private drawMarquee(x1: number, y1: number, x2: number, y2: number): void {
    const x = Math.min(x1, x2)
    const y = Math.min(y1, y2)
    const w = Math.abs(x2 - x1)
    const h = Math.abs(y2 - y1)
    this.marqueeEl.style.display = 'block'
    this.marqueeEl.style.left = `${x}px`
    this.marqueeEl.style.top = `${y}px`
    this.marqueeEl.style.width = `${w}px`
    this.marqueeEl.style.height = `${h}px`
  }

  private applyMarqueeSelection(x1: number, y1: number, x2: number, y2: number): void {
    const a = this.viewport.toWorld(Math.min(x1, x2), Math.min(y1, y2))
    const b = this.viewport.toWorld(Math.max(x1, x2), Math.max(y1, y2))
    for (const s of this.board.state.shapes) {
      const inside =
        s.x < b.x && s.x + s.w > a.x && s.y < b.y && s.y + s.h > a.y
      if (inside) this.selection.add(s.id)
    }
    this.refresh()
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    const p = this.localPoint(e)
    const factor = Math.exp(-e.deltaY * 0.0015)
    this.viewport.zoomAt(p.x, p.y, factor)
  }

  private onDoubleClick(e: MouseEvent): void {
    const shapeEl = (e.target as HTMLElement).closest('.shape') as HTMLElement | null
    if (!shapeEl) return
    const shape = this.board.shape(shapeEl.dataset.id!)
    if (shape) this.startTextEdit(shape)
  }

  private startTextEdit(shape: Shape): void {
    const tl = this.viewport.toScreen(shape.x, shape.y)
    const ta = document.createElement('textarea')
    ta.className = 'text-editor'
    ta.value = shape.text
    ta.style.left = `${tl.x}px`
    ta.style.top = `${tl.y}px`
    ta.style.width = `${Math.max(shape.w * this.viewport.zoom, 60)}px`
    ta.style.minHeight = `${Math.max(shape.h * this.viewport.zoom, 24)}px`
    this.handlesEl.appendChild(ta)
    ta.focus()
    ta.select()

    let done = false
    const commit = () => {
      if (done) return
      done = true
      const text = ta.value
      ta.remove()
      if (text !== shape.text) {
        const before = this.board.clone()
        shape.text = text
        this.history.push(before)
        this.commit()
      }
    }
    ta.addEventListener('blur', commit)
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        commit()
      } else if (e.key === 'Escape') {
        ta.value = shape.text
        commit()
      }
    })
  }

  // ---- keyboard ------------------------------------------------------------

  private onKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return

    if (e.code === 'Space') {
      this.spaceHeld = true
      this.viewportEl.classList.add('panning')
      e.preventDefault()
      return
    }

    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) this.redo()
      else this.undo()
      return
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      this.redo()
      return
    }
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      this.duplicateSelected()
      return
    }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      this.selectAll()
      return
    }
    if (mod && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      this.copySelected()
      return
    }
    if (mod && e.key.toLowerCase() === 'x') {
      e.preventDefault()
      this.cutSelected()
      return
    }
    if (mod && e.key.toLowerCase() === 'v') {
      e.preventDefault()
      this.paste()
      return
    }

    const lower = e.key.toLowerCase()
    if (lower === 'delete' || lower === 'backspace') {
      e.preventDefault()
      this.deleteSelected()
      return
    }
    if (lower === 'escape') {
      this.clearSelection()
      return
    }
    if (lower === 'arrowup' || lower === 'arrowdown' || lower === 'arrowleft' || lower === 'arrowright') {
      if (this.selection.size > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = lower === 'arrowleft' ? -step : lower === 'arrowright' ? step : 0
        const dy = lower === 'arrowup' ? -step : lower === 'arrowdown' ? step : 0
        this.nudge(dx, dy)
      }
      return
    }
    if (TOOL_KEYS[lower]) {
      this.setTool(TOOL_KEYS[lower])
      return
    }
    if (lower === '0') this.viewport.reset()
    if (lower === '=' || lower === '+') {
      const r = this.viewportEl.getBoundingClientRect()
      this.viewport.zoomAt(r.width / 2, r.height / 2, 1.15)
    }
    if (lower === '-') {
      const r = this.viewportEl.getBoundingClientRect()
      this.viewport.zoomAt(r.width / 2, r.height / 2, 1 / 1.15)
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spaceHeld = false
      this.viewportEl.classList.remove('panning')
    }
  }

  setTool(tool: Tool): void {
    this.tool = tool
    this.connectorSource = null
    this.hideMeasure()
    this.viewportEl.dataset.tool = tool
    document.querySelectorAll('.toolbar [data-tool]').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.tool === tool)
    })
  }

  private updateMeasure(a: { x: number; y: number }, b: { x: number; y: number }): void {
    const svg = document.getElementById('measure')
    const line = document.getElementById('measure-line') as SVGLineElement | null
    const label = document.getElementById('measure-label') as SVGTextElement | null
    if (!svg || !line || !label) return
    const sa = this.viewport.toScreen(a.x, a.y)
    const sb = this.viewport.toScreen(b.x, b.y)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.round(Math.hypot(dx, dy))
    const angle = Math.round(Math.abs((Math.atan2(dy, dx) * 180) / Math.PI))
    svg.hidden = false
    line.setAttribute('x1', String(sa.x))
    line.setAttribute('y1', String(sa.y))
    line.setAttribute('x2', String(sb.x))
    line.setAttribute('y2', String(sb.y))
    label.setAttribute('x', String((sa.x + sb.x) / 2 + 8))
    label.setAttribute('y', String((sa.y + sb.y) / 2 - 8))
    label.textContent = `${dist} px · ${angle}°`
  }

  private hideMeasure(): void {
    const svg = document.getElementById('measure')
    if (svg) svg.hidden = true
  }
}
