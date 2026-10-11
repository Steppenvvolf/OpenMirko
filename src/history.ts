// Undo/redo as an immutable snapshot stack.

import type { BoardState } from './types'

export class History {
  private undoStack: string[] = []
  private redoStack: string[] = []
  private maxDepth: number

  constructor(maxDepth = 100) {
    this.maxDepth = maxDepth
  }

  /** Record a snapshot. Call after a commit-sized change. */
  push(state: BoardState): void {
    this.undoStack.push(JSON.stringify(state))
    if (this.undoStack.length > this.maxDepth) this.undoStack.shift()
    this.redoStack = []
  }

  /** Current state, before any change, must be pushed first. */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Drop all history; optionally re-baseline with the given state. */
  reset(state?: BoardState): void {
    this.undoStack = []
    this.redoStack = []
    if (state) this.push(state)
  }

  undo(current: BoardState): BoardState | null {
    if (!this.canUndo()) return null
    this.redoStack.push(JSON.stringify(current))
    return JSON.parse(this.undoStack.pop()!) as BoardState
  }

  redo(current: BoardState): BoardState | null {
    if (!this.canRedo()) return null
    this.undoStack.push(JSON.stringify(current))
    return JSON.parse(this.redoStack.pop()!) as BoardState
  }
}
