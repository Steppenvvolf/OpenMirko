// Shared types and constants for OpenMirko.

export type ShapeType =
  | 'sticky'
  | 'rect'
  | 'ellipse'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'star'
  | 'cloud'
  | 'pen'
  | 'frame'
  | 'text'
export type ConnectorKind = 'arrow' | 'line'
export type Tool = 'select' | ShapeType | 'connector'

export interface Shape {
  id: string
  type: ShapeType
  x: number // top-left, world coordinates
  y: number
  w: number
  h: number
  text: string
  color: string
  /** Pen strokes only: polyline points in world coordinates. */
  points?: { x: number; y: number }[]
  /** Pen stroke width in world units. */
  strokeWidth?: number
  /** Font size in px (shapes with text). */
  fontSize?: number
}

export interface Connector {
  id: string
  kind: ConnectorKind
  fromId: string
  toId: string
  color: string
}

export interface BoardState {
  version: number
  shapes: Shape[]
  connectors: Connector[]
}

export interface ShapeDefaults {
  w: number
  h: number
  color: string
  label: string
  fontSize?: number
}

export const SHAPE_DEFAULTS: Record<ShapeType, ShapeDefaults> = {
  sticky: { w: 200, h: 200, color: '#FDE68A', label: 'Sticky note' },
  rect: { w: 180, h: 110, color: '#FFFFFF', label: 'Rectangle' },
  ellipse: { w: 180, h: 110, color: '#DBEAFE', label: 'Ellipse' },
  diamond: { w: 180, h: 180, color: '#FBCFE8', label: 'Diamond' },
  triangle: { w: 180, h: 160, color: '#FDE68A', label: 'Triangle' },
  hexagon: { w: 180, h: 156, color: '#D1FAE5', label: 'Hexagon' },
  star: { w: 180, h: 180, color: '#FEF08A', label: 'Star' },
  cloud: { w: 200, h: 120, color: '#E0F2FE', label: 'Cloud' },
  pen: { w: 100, h: 100, color: '#1E293B', label: 'Pen' },
  frame: { w: 800, h: 500, color: '#FFFFFF', label: 'Frame', fontSize: 14 },
  text: { w: 180, h: 48, color: 'transparent', label: 'Text', fontSize: 20 },
}

export const CONNECTOR_COLOR = '#64748B'
export const MIN_SIZE = 24
export const GRID = 28
export const DEFAULT_FONT_SIZE = 15

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
