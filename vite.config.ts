import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL

  return {
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    proxy: {
      '/functions/v1': {
        target:      supabaseUrl,
        changeOrigin: true,
        secure:      true,
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'feedback-csv',
      configureServer(server) {
        server.middlewares.use('/api/feedback-csv', (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const data = JSON.parse(body) as Record<string, unknown>
              const dir  = join(process.cwd(), 'feedback')
              if (!existsSync(dir)) mkdirSync(dir)
              const file = join(dir, 'feedback_log.csv')
              const keys = Object.keys(data)
              const row  = keys.map(k => JSON.stringify(String(data[k] ?? ''))).join(',')
              if (!existsSync(file)) writeFileSync(file, keys.join(',') + '\n')
              appendFileSync(file, row + '\n')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (err) {
              console.error('[feedback-csv] write failed:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ ok: false, error: String(err) }))
            }
          })
        })
      },
    },
    VitePWA({
      strategies:   'injectManifest',
      srcDir:       'src',
      filename:     'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'LawTracker — Women for Shared Progress',
        short_name: 'LawTracker',
        description: 'Track legislation that matters for women and shared progress',
        theme_color: '#6d28d9',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  }
})
