import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7317,
    proxy: {
      // 127.0.0.1, not localhost: on some Windows/IPv6 setups `localhost`
      // resolves to ::1 first and the dev proxy stalls against the backend's
      // published IPv4 port.
      '/api': 'http://127.0.0.1:8317'
    }
  }
})
