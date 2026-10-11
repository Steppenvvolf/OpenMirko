import { Editor } from './editor'
import { downloadPNG, downloadSVG, printBoard } from './export'
import * as persist from './persist'
import { templates } from './templates'
import type { AlignAxis } from './layout'
import type { Tool } from './types'

const viewport = document.getElementById('viewport')!
const canvas = document.getElementById('canvas')!
const svg = document.getElementById('connectors') as unknown as SVGSVGElement
const handles = document.getElementById('handles')!
const marquee = document.getElementById('marquee')!

const initial = persist.loadInitial()
const editor = new Editor(viewport, canvas, svg, handles, marquee, initial.state)
editor.boardId = initial.id

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
btn('btn-export-svg').addEventListener('click', () => {
  downloadSVG(editor.board.clone())
  toast('Board exported as SVG')
})
btn('btn-export-png').addEventListener('click', async () => {
  await downloadPNG(editor.board.clone())
  toast('Board exported as PNG')
})
btn('btn-export-pdf').addEventListener('click', () => printBoard(editor.board.clone()))
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
  const name = prompt('Board name:', 'Untitled')
  if (name === null) return
  const { id, state } = persist.createBoard(name)
  editor.boardId = id
  editor.loadState(state)
  refreshBoards()
  toast('Created new board')
})
btn('btn-rename').addEventListener('click', () => {
  const cur = persist.listBoards().find((b) => b.id === editor.boardId)
  const name = prompt('Board name:', cur?.name ?? 'Untitled')
  if (name === null) return
  persist.renameBoard(editor.boardId, name)
  refreshBoards()
})

// board switcher
const boardSelect = document.getElementById('board-select') as HTMLSelectElement
function refreshBoards(): void {
  boardSelect.innerHTML = ''
  for (const b of persist.listBoards()) {
    const opt = document.createElement('option')
    opt.value = b.id
    opt.textContent = b.name
    boardSelect.appendChild(opt)
  }
  boardSelect.value = editor.boardId
}
refreshBoards()
boardSelect.addEventListener('change', () => {
  const id = boardSelect.value
  const state = persist.loadBoard(id)
  if (state) {
    editor.boardId = id
    persist.setActiveId(id)
    editor.loadState(state)
  }
})
btn('btn-mindmap').addEventListener('click', () => {
  editor.mindMap()
  toast('Arranged as mind map')
})

// toolbar: search
const searchInput = document.getElementById('search-input') as HTMLInputElement
searchInput.addEventListener('input', () => editor.search(searchInput.value))

// toolbar: templates
const templateSelect = document.getElementById('template-select') as HTMLSelectElement
templateSelect.addEventListener('change', () => {
  const id = templateSelect.value
  templateSelect.value = ''
  if (!id) return
  if (confirm('Load this template? The current board will be replaced.')) {
    const t = templates.find((t) => t.id === id)
    if (t) {
      editor.loadState(t.build())
      toast(`Loaded ${t.name} template`)
    }
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
btn('cb-border-down').addEventListener('click', () => editor.setBorderWidth(-1))
btn('cb-border-up').addEventListener('click', () => editor.setBorderWidth(1))
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
