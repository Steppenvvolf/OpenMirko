// Shared types and constants for OpenMirko.

export type ShapeType = 'sticky' | 'rect' | 'ellipse' | 'text'
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
}

export const SHAPE_DEFAULTS: Record<ShapeType, ShapeDefaults> = {
  sticky: { w: 200, h: 200, color: '#FDE68A', label: 'Sticky note' },
  rect: { w: 180, h: 110, color: '#FFFFFF', label: 'Rectangle' },
  ellipse: { w: 180, h: 110, color: '#DBEAFE', label: 'Ellipse' },
  text: { w: 180, h: 48, color: 'transparent', label: 'Text' },
}

export const CONNECTOR_COLOR = '#64748B'
export const MIN_SIZE = 24

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
