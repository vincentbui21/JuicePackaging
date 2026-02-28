import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,           // listen on all interfaces
    port: 5174,
    strictPort: true,
    allowedHosts: ['customer.mehustaja.fi'], // or just remove this line
  },
})
