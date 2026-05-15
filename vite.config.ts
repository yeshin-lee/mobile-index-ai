import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function readAnthropicApiKey(mode: string, cwd: string): string {
  const fromFiles = loadEnv(mode, cwd, 'VITE_').VITE_ANTHROPIC_API_KEY
  const raw = (fromFiles ?? process.env.VITE_ANTHROPIC_API_KEY ?? '').toString()
  return raw.replace(/^\uFEFF/, '').trim()
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const anthropicApiKey = readAnthropicApiKey(mode, process.cwd())

  if (mode === 'development' && !anthropicApiKey) {
    console.warn(
      '[vite] VITE_ANTHROPIC_API_KEY가 비어 있습니다. /api/anthropic 프록시에 x-api-key가 붙지 않아 401이 날 수 있습니다.',
    )
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (anthropicApiKey) {
                proxyReq.setHeader('x-api-key', anthropicApiKey)
              }
              proxyReq.setHeader('anthropic-version', '2023-06-01')
              proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true')
              proxyReq.setHeader('content-type', 'application/json')
            })
          },
        },
      },
    },
  }
})
