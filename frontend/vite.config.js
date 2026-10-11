import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()], // включаем поддержку JSX/React
  server: {
    port: 5173,
    // Прокси: пока мы разрабатываем, Vite крутится на 5173, а Django — на 8000.
    // Чтобы фронтенд и бэкенд «жили» на одном адресе с точки зрения браузера,
    // запросы на /api, /admin и /static перекидываем на Django.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/admin': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/static': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
