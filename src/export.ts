// Board -> SVG export (pure), plus PNG/SVG download helpers (DOM).
import type { BoardState, Connector, Shape } from './types'
import { DEFAULT_FONT_SIZE } from './types'

const NS = 'http://www.w3.org/2000/svg'
const PAD = 24

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function boardBounds(state: BoardState): Bounds | null {
  if (state.shapes.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of state.shapes) {
    minX = Math.min(minX, s.x)
    minY = Math.min(minY, s.y)
    maxX = Math.max(maxX, s.x + s.w)
    maxY = Math.max(maxY, s.y + s.h)
  }
  return { minX, minY, maxX, maxY }
}

/** Point on a shape's bounding-box edge toward (tx, ty). */
function anchor(s: Shape, tx: number, ty: number): { x: number; y: number } {
  const cx = s.x + s.w / 2
  const cy = s.y + s.h / 2
  const dx = tx - cx
  const dy = ty - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const sx = dx === 0 ? Infinity : s.w / 2 / Math.abs(dx)
  const sy = dy === 0 ? Infinity : s.h / 2 / Math.abs(dy)
  const k = Math.min(sx, sy)
  return { x: cx + dx * k, y: cy + dy * k }
}

function starPoints(s: Shape): string {
  const cx = s.x + s.w / 2
  const cy = s.y + s.h / 2
  const R = s.w / 2
  const r = R * 0.4
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const aOut = ((-90 + i * 72) * Math.PI) / 180
    const aIn = ((-90 + 36 + i * 72) * Math.PI) / 180
    pts.push(`${cx + R * Math.cos(aOut)},${cy + R * Math.sin(aOut)}`)
    pts.push(`${cx + r * Math.cos(aIn)},${cy + r * Math.sin(aIn)}`)
  }
  return pts.join(' ')
}

function textEl(s: Shape, center: boolean): string {
  if (!s.text) return ''
  const fs = s.fontSize ?? DEFAULT_FONT_SIZE
  const lines = s.text.split('\n')
  const lineH = fs * 1.4
  const anchorX = center ? s.x + s.w / 2 : s.x + 12
  const startY = center ? s.y + s.h / 2 - ((lines.length - 1) * lineH) / 2 : s.y + 12 + fs * 0.8
  const tspans = lines.map((ln, i) => `<tspan x="${anchorX}" y="${startY + i * lineH}">${esc(ln)}</tspan>`).join('')
  return `<text font-family="system-ui, sans-serif" font-size="${fs}" text-anchor="${center ? 'middle' : 'start'}">${tspans}</text>`
}

function penEl(s: Shape): string {
  if (!s.points || s.points.length === 0) return ''
  const width = s.strokeWidth ?? 2.5
  if (s.points.length === 1) {
    return `<circle cx="${s.points[0].x}" cy="${s.points[0].y}" r="${Math.max(width, 2)}" fill="${s.color}"/>`
  }
  const d = 'M ' + s.points.map((p) => `${p.x},${p.y}`).join(' L ')
  return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
}

function shapeEl(s: Shape): string {
  const cx = s.x + s.w / 2
  const cy = s.y + s.h / 2
  let el = ''
  let center = true
  switch (s.type) {
    case 'rect':
      el = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="4" fill="${s.color}" stroke="#475569" stroke-width="2"/>`
      break
    case 'sticky':
      el = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="3" fill="${s.color}" stroke="#d9b44a" stroke-width="1"/>`
      break
    case 'ellipse':
      el = `<ellipse cx="${cx}" cy="${cy}" rx="${s.w / 2}" ry="${s.h / 2}" fill="${s.color}" stroke="#3b82f6" stroke-width="2"/>`
      break
    case 'diamond':
      el = `<polygon points="${cx},${s.y} ${s.x + s.w},${cy} ${cx},${s.y + s.h} ${s.x},${cy}" fill="${s.color}"/>`
      break
    case 'triangle':
      el = `<polygon points="${cx},${s.y} ${s.x + s.w},${s.y + s.h} ${s.x},${s.y + s.h}" fill="${s.color}"/>`
      break
    case 'hexagon':
      el = `<polygon points="${s.x + s.w * 0.25},${s.y} ${s.x + s.w * 0.75},${s.y} ${s.x + s.w},${cy} ${s.x + s.w * 0.75},${s.y + s.h} ${s.x + s.w * 0.25},${s.y + s.h} ${s.x},${cy}" fill="${s.color}"/>`
      break
    case 'star':
      el = `<polygon points="${starPoints(s)}" fill="${s.color}"/>`
      break
    case 'cloud':
      el = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${Math.min(s.w, s.h) / 2}" fill="${s.color}"/>`
      break
    case 'frame':
      el = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="6" fill="${s.color}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 6"/>`
      break
    case 'text':
      el = ''
      center = false
      break
    case 'pen':
      return penEl(s)
  }
  return el + textEl(s, center)
}

function connectorEl(state: BoardState, c: Connector): string {
  const from = state.shapes.find((s) => s.id === c.fromId)
  const to = state.shapes.find((s) => s.id === c.toId)
  if (!from || !to) return ''
  const a = anchor(from, to.x + to.w / 2, to.y + to.h / 2)
  const b = anchor(to, from.x + from.w / 2, from.y + from.h / 2)
  let head = ''
  if (c.kind === 'arrow') {
    const size = 9
    const ang = Math.atan2(b.y - a.y, b.x - a.x)
    const p2 = `${b.x - size * Math.cos(ang - Math.PI / 6)},${b.y - size * Math.sin(ang - Math.PI / 6)}`
    const p3 = `${b.x - size * Math.cos(ang + Math.PI / 6)},${b.y - size * Math.sin(ang + Math.PI / 6)}`
    head = `<polygon points="${b.x},${b.y} ${p2} ${p3}" fill="${c.color}"/>`
  }
  return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${c.color}" stroke-width="2.5" stroke-linecap="round"/>${head}`
}

export function toSVG(state: BoardState): string {
  const b = boardBounds(state)
  if (!b) return `<svg xmlns="${NS}" width="100" height="100"><rect width="100" height="100" fill="#f8fafc"/></svg>`
  const w = b.maxX - b.minX + PAD * 2
  const h = b.maxY - b.minY + PAD * 2
  const x = b.minX - PAD
  const y = b.minY - PAD
  const body = state.shapes.map(shapeEl).join('') + state.connectors.map((c) => connectorEl(state, c)).join('')
  return `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">\n<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f8fafc"/>\n${body}\n</svg>`
}

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

export function downloadSVG(state: BoardState): void {
  const blob = new Blob([toSVG(state)], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `openmirko-board-${stamp()}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPNG(state: BoardState, scale = 2): Promise<void> {
  const blob = new Blob([toSVG(state)], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('failed to rasterize board'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)
  const pngBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!pngBlob) return
  const pngUrl = URL.createObjectURL(pngBlob)
  const a = document.createElement('a')
  a.href = pngUrl
  a.download = `openmirko-board-${stamp()}.png`
  a.click()
  URL.revokeObjectURL(pngUrl)
}
