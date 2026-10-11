import { Editor } from './editor'
import * as persist from './persist'
import type { AlignAxis } from './layout'
import type { Tool } from './types'

const viewport = document.getElementById('viewport')!
const canvas = document.getElementById('canvas')!
const svg = document.getElementById('connectors') as unknown as SVGSVGElement
const handles = document.getElementById('handles')!
const marquee = document.getElementById('marquee')!

const editor = new Editor(
  viewport,
  canvas,
  svg,
  handles,
  marquee,
  persist.load() ?? persist.emptyBoard(),
)

// toolbar: tool buttons
document.querySelectorAll<HTMLElement>('.toolbar [data-tool]').forEach((btn) => {
  btn.addEventListener('click', () => editor.setTool(btn.dataset.tool as Tool))
})

// toolbar: actions
const btn = (id: string) => document.getElementById(id)!
btn('btn-undo').addEventListener('click', () => editor.undo())
btn('btn-redo').addEventListener('click', () => editor.redo())
btn('btn-zoom-in').addEventListener('click', () => {
  const r = viewport.getBoundingClientRect()
  editor.viewport.zoomAt(r.width / 2, r.height / 2, 1.15)
})
btn('btn-zoom-out').addEventListener('click', () => {
  const r = viewport.getBoundingClientRect()
  editor.viewport.zoomAt(r.width / 2, r.height / 2, 1 / 1.15)
})
btn('btn-reset').addEventListener('click', () => editor.viewport.reset())
btn('btn-export').addEventListener('click', () => {
  persist.exportJSON(editor.board.clone())
  toast('Board exported as JSON')
})
btn('btn-import').addEventListener('click', () => btn('file-input').click())
btn('file-input').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const state = await persist.importJSON(file)
    editor.loadState(state)
    toast('Board imported')
  } catch (err) {
    toast(`Import failed: ${err instanceof Error ? err.message : 'invalid file'}`)
  }
})
btn('btn-new').addEventListener('click', () => {
  if (confirm('Start a new board? The current board will be cleared. Export first to keep it.')) {
    editor.clearBoard()
  }
})

// context bar: colors
document.querySelectorAll<HTMLElement>('.swatch').forEach((s) => {
  s.addEventListener('click', () => editor.setColor(s.dataset.color!))
})
const colorCustom = document.getElementById('color-custom') as HTMLInputElement
colorCustom.addEventListener('input', () => editor.setColor(colorCustom.value))

// context bar: align / distribute
document.querySelectorAll<HTMLElement>('[data-align]').forEach((b) => {
  b.addEventListener('click', () => editor.align(b.dataset.align as AlignAxis))
})
document.querySelectorAll<HTMLElement>('[data-distribute]').forEach((b) => {
  b.addEventListener('click', () => editor.distribute(b.dataset.distribute as 'x' | 'y'))
})

// context bar: snap toggle
btn('cb-snap').addEventListener('click', () => editor.setSnap(!editor.snapEnabled))

// context bar: font size + z-order
btn('cb-font-down').addEventListener('click', () => editor.setFontSize(-2))
btn('cb-font-up').addEventListener('click', () => editor.setFontSize(2))
document.querySelectorAll<HTMLElement>('[data-z]').forEach((b) => {
  b.addEventListener('click', () => (b.dataset.z === 'front' ? editor.bringFront() : editor.sendBack()))
})

editor.setTool('select')

let toastTimer: number | undefined
function toast(msg: string): void {
  let el = document.getElementById('toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast'
    el.className = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600)
}
