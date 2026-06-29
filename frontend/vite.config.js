import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7317,
    proxy: {
      '/api': 'http://localhost:8317'
    }
  }
})
