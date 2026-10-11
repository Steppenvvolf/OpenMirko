// Starter board templates.
import type { BoardState, Connector, Shape } from './types'

export interface Template {
  id: string
  name: string
  build(): BoardState
}

function sticky(id: string, x: number, y: number, text: string, color = '#FDE68A'): Shape {
  return { id, type: 'sticky', x, y, w: 160, h: 100, text, color, fontSize: 15 }
}

function rect(id: string, x: number, y: number, w: number, h: number, text: string, color = '#FFFFFF'): Shape {
  return { id, type: 'rect', x, y, w, h, text, color, fontSize: 15, borderWidth: 2 }
}

function frame(id: string, x: number, y: number, text: string): Shape {
  return { id, type: 'frame', x, y, w: 300, h: 500, text, color: '#FFFFFF', fontSize: 14, borderWidth: 2 }
}

function arrow(id: string, fromId: string, toId: string): Connector {
  return { id, kind: 'arrow', fromId, toId, color: '#64748B' }
}

export const templates: Template[] = [
  { id: 'blank', name: 'Blank', build: () => ({ version: 1, shapes: [], connectors: [] }) },
  {
    id: 'mindmap',
    name: 'Mind map',
    build: () => ({
      version: 1,
      shapes: [
        sticky('root', 0, 0, 'Central idea', '#FDE68A'),
        sticky('b1', 300, -180, 'Branch 1', '#BFDBFE'),
        sticky('b2', 300, 0, 'Branch 2', '#A7F3D0'),
        sticky('b3', 300, 180, 'Branch 3', '#FBCFE8'),
        sticky('b1a', 600, -240, 'Sub 1', '#BFDBFE'),
        sticky('b1b', 600, -120, 'Sub 2', '#BFDBFE'),
      ],
      connectors: [
        arrow('e1', 'root', 'b1'),
        arrow('e2', 'root', 'b2'),
        arrow('e3', 'root', 'b3'),
        arrow('e4', 'b1', 'b1a'),
        arrow('e5', 'b1', 'b1b'),
      ],
    }),
  },
  {
    id: 'flowchart',
    name: 'Flowchart',
    build: () => ({
      version: 1,
      shapes: [
        rect('start', 0, 0, 160, 60, 'Start', '#A7F3D0'),
        rect('step1', 0, 140, 160, 60, 'Do the thing', '#FFFFFF'),
        rect('decide', 0, 280, 160, 60, 'Worked?', '#FDE68A'),
        rect('yes', 300, 280, 160, 60, 'Ship it', '#A7F3D0'),
        rect('no', -300, 420, 160, 60, 'Retry', '#FCA5A5'),
      ],
      connectors: [
        arrow('e1', 'start', 'step1'),
        arrow('e2', 'step1', 'decide'),
        arrow('e3', 'decide', 'yes'),
        arrow('e4', 'decide', 'no'),
      ],
    }),
  },
  {
    id: 'kanban',
    name: 'Kanban',
    build: () => ({
      version: 1,
      shapes: [
        frame('todo', 0, 0, 'To do'),
        frame('doing', 360, 0, 'Doing'),
        frame('done', 720, 0, 'Done'),
        sticky('c1', 20, 60, 'Card 1'),
        sticky('c2', 20, 200, 'Card 2'),
        sticky('c3', 380, 60, 'Card 3'),
        sticky('c4', 740, 60, 'Card 4'),
      ],
      connectors: [],
    }),
  },
]
