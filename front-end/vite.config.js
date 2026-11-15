// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'

const API = `http://localhost:${process.env.BLOCKPLUS_API_PORT || 5000}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    tailwindcss(),
    react(),
  ],
  server: {
    allowedHosts: true,
    port: 3000,
    proxy: {
      '/auth': {
        target: API, // Seu servidor Express
        changeOrigin: true,
      },
      '/api': {
        target: API,
        changeOrigin: true,
      },
      '/file': {
        target: API,
        changeOrigin: true,
      }
    }
  }
})