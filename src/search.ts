// Search shapes by text content (pure).
import type { BoardState } from './types'

/** Ids of shapes whose text contains the query (case-insensitive substring). */
export function searchShapes(state: BoardState, query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return state.shapes.filter((s) => s.text && s.text.toLowerCase().includes(q)).map((s) => s.id)
}
