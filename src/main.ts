import { Editor } from './editor'
import * as persist from './persist'
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
btn('btn-export').addEventListener('click', () => persist.exportJSON(editor.board.clone()))
btn('btn-import').addEventListener('click', () => btn('file-input').click())
btn('file-input').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const state = await persist.importJSON(file)
    editor.loadState(state)
  } catch {
    // silently ignore malformed files for now
  }
})

editor.setTool('select')
