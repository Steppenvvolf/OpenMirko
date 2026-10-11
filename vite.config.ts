import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the built app works from any static host or a file:// path.
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
})
