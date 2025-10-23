import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    commonjsOptions: {
      ignoreTryCatch: true
    }
  },
  resolve: {
    alias: {
      'three/webgpu': 'three',
      'three/tsl': 'three',
      'three/addons': 'three'
    }
  }
})
