import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gatewayTarget =
    env.VITE_API_GATEWAY_URL ||
    env.VITE_MANAGEMENT_API_URL ||
    env.VITE_API_BASE_URL ||
    'http://localhost:5000'

  return {
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/hubs': {
          target: gatewayTarget,
          secure: false,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
