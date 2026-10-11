// Persistence: localStorage autosave + JSON export/import.

import type { BoardState } from './types'

const STORAGE_KEY = 'openmirko:board'

export function load(): BoardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BoardState
    if (!Array.isArray(parsed.shapes) || !Array.isArray(parsed.connectors)) return null
    return parsed
  } catch {
    return null
  }
}

export function save(state: BoardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable — non-fatal for a local-first tool
  }
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

export function emptyBoard(): BoardState {
  return { version: 1, shapes: [], connectors: [] }
}

function dateStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}
