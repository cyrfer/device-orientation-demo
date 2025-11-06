import { defineConfig } from 'vite'

export default defineConfig({
  base: '/device-orientation-demo/',
  root: '.',
  build: {
    outDir: 'dist',
    target: 'es2022'
  },
  server: {
    port: 3000,
    open: true
  }
})