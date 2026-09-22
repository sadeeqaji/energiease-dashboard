import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://127.0.0.1:5050'

  return {
    plugins: [tailwindcss(), react()],
    server: {
      allowedHosts: true,
      proxy: {
        '/auth': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/admin': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/orders': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})



