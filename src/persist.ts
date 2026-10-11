// Persistence: multiple local-first boards + JSON import/export.
import type { BoardState } from './types'

const INDEX_KEY = 'openmirko:boards'
const BOARD_PREFIX = 'openmirko:board:'
const ACTIVE_KEY = 'openmirko:active'
const LEGACY_KEY = 'openmirko:board' // pre-multi-board single-board storage

export interface BoardMeta {
  id: string
  name: string
  updatedAt: number
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — non-fatal for a local-first tool
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {}
}

export function emptyBoard(): BoardState {
  return { version: 1, shapes: [], connectors: [] }
}

function newId(): string {
  return `b-${crypto.randomUUID().slice(0, 8)}`
}

export function listBoards(): BoardMeta[] {
  return read<BoardMeta[]>(INDEX_KEY) ?? []
}

function saveIndex(list: BoardMeta[]): void {
  write(INDEX_KEY, list)
}

export function createBoard(name: string): { id: string; state: BoardState } {
  const id = newId()
  const list = listBoards()
  list.push({ id, name: name.trim() || 'Untitled', updatedAt: Date.now() })
  saveIndex(list)
  const state = emptyBoard()
  write(BOARD_PREFIX + id, state)
  write(ACTIVE_KEY, id)
  return { id, state }
}

export function loadBoard(id: string): BoardState | null {
  const parsed = read<BoardState>(BOARD_PREFIX + id)
  if (!parsed || !Array.isArray(parsed.shapes) || !Array.isArray(parsed.connectors)) return null
  return parsed
}

export function saveBoard(id: string, state: BoardState): void {
  write(BOARD_PREFIX + id, state)
  const list = listBoards()
  const meta = list.find((b) => b.id === id)
  if (meta) {
    meta.updatedAt = Date.now()
    saveIndex(list)
  }
}

export function getActiveId(): string | null {
  return read<string>(ACTIVE_KEY)
}

export function setActiveId(id: string): void {
  write(ACTIVE_KEY, id)
}

export function renameBoard(id: string, name: string): void {
  const list = listBoards()
  const meta = list.find((b) => b.id === id)
  if (meta && name.trim()) {
    meta.name = name.trim()
    saveIndex(list)
  }
}

export function deleteBoard(id: string): void {
  remove(BOARD_PREFIX + id)
  const list = listBoards().filter((b) => b.id !== id)
  saveIndex(list)
  if (getActiveId() === id) {
    write(ACTIVE_KEY, list.length > 0 ? list[0].id : null)
  }
}

/**
 * Load the active board (or the first available), migrating any legacy
 * single-board data to the new multi-board format on first run.
 */
export function loadInitial(): { id: string; state: BoardState } {
  const legacy = read<BoardState>(LEGACY_KEY)
  if (legacy && listBoards().length === 0) {
    const { id, state } = createBoard('My board')
    state.shapes = legacy.shapes ?? []
    state.connectors = legacy.connectors ?? []
    saveBoard(id, state)
    remove(LEGACY_KEY)
    return { id, state }
  }
  const activeId = getActiveId()
  if (activeId) {
    const state = loadBoard(activeId)
    if (state) return { id: activeId, state }
  }
  const list = listBoards()
  if (list.length > 0) {
    const state = loadBoard(list[0].id)
    if (state) return { id: list[0].id, state }
  }
  return createBoard('My board')
}

export function exportJSON(state: BoardState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `openmirko-board-${dateStamp()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importJSON(file: File): Promise<BoardState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BoardState
        if (!Array.isArray(parsed.shapes) || !Array.isArray(parsed.connectors)) {
          reject(new Error('Not a valid OpenMirko board file'))
          return
        }
        resolve(parsed)
      } catch (e) {
        reject(e as Error)
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsText(file)
  })
}

function dateStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}
