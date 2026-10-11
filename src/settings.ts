// App-level settings: theme, grid, snap. Persisted to localStorage.
export interface Settings {
  theme: 'dark' | 'light'
  showGrid: boolean
  snap: boolean
}

const KEY = 'openmirko:settings'

export const DEFAULTS: Settings = { theme: 'dark', showGrid: true, snap: false }

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    // corrupt settings -> fall back to defaults
  }
  return { ...DEFAULTS }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}

export function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme
}

export function applyGrid(show: boolean): void {
  document.getElementById('viewport')?.classList.toggle('no-grid', !show)
}
