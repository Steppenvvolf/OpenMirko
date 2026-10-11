import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the built app works from any static host, a file:// path,
  // or the Tauri desktop shell.
  base: './',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
})
