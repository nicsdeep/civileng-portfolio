/// <reference types="vitest/config" />
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Serves the Vercel functions in /api during `npm run dev`, so local
 * development behaves like production without the Vercel CLI.
 * Each file exports `GET(request: Request): Promise<Response>`.
 */
function localApi(): Plugin {
  const routes: Record<string, string> = { '/preview': '/api/preview.ts' }
  return {
    name: 'local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api', async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const file = routes[url.pathname]
        if (!file || req.method !== 'GET') return next()
        try {
          const mod = await server.ssrLoadModule(file)
          const response: Response = await mod.GET(new Request(new URL('/api' + url.pathname + url.search, 'http://localhost')))
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.config.logger.error(String(error))
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Local API error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: they change far less often than the site.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router', '@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
