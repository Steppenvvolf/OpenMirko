// Mind-map auto-layout: arrange connected shapes as a horizontal tree.
import type { Connector, Shape } from './types'

export interface NodePos {
  id: string
  x: number
  y: number
}

/**
 * Lay out the connected component rooted at `rootId` as a horizontal tree.
 * The root keeps its current position; children radiate right, stacked
 * vertically so no two siblings overlap. Disconnected shapes are untouched.
 */
export function mindMapLayout(
  shapes: Shape[],
  connectors: Connector[],
  rootId: string,
  gapX = 280,
  gapY = 140,
): NodePos[] {
  const byId = new Map(shapes.map((s) => [s.id, s]))
  const root = byId.get(rootId)
  if (!root) return []

  const adj = new Map<string, string[]>()
  for (const s of shapes) adj.set(s.id, [])
  for (const c of connectors) {
    if (byId.has(c.fromId) && byId.has(c.toId)) {
      adj.get(c.fromId)!.push(c.toId)
      adj.get(c.toId)!.push(c.fromId)
    }
  }

  // Build a spanning tree via DFS from the root.
  const children = new Map<string, string[]>()
  const visited = new Set<string>([rootId])
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    const kids: string[] = []
    for (const nb of adj.get(id) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb)
        kids.push(nb)
        stack.push(nb)
      }
    }
    children.set(id, kids)
  }

  // Assign vertical "slots": leaves get consecutive integers, internal nodes
  // are centered on their children. This guarantees no sibling overlap.
  const slot = new Map<string, number>()
  let next = 0
  const assign = (id: string): number => {
    const kids = children.get(id) ?? []
    if (kids.length === 0) {
      slot.set(id, next++)
      return next - 1
    }
    let first = Infinity
    let last = -Infinity
    for (const k of kids) {
      const s = assign(k)
      first = Math.min(first, s)
      last = Math.max(last, s)
    }
    const mid = (first + last) / 2
    slot.set(id, mid)
    return mid
  }
  assign(rootId)

  const result: NodePos[] = []
  const place = (id: string, depth: number) => {
    result.push({ id, x: root.x + depth * gapX, y: root.y + slot.get(id)! * gapY })
    for (const k of children.get(id) ?? []) place(k, depth + 1)
  }
  place(rootId, 0)
  return result
}
