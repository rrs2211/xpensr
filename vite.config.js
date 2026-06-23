import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ANTHROPIC_KEY = env.VITE_ANTHROPIC_KEY || env.ANTHROPIC_KEY || ''

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],

        manifest: {
          name: 'XpensR by RB',
          short_name: 'XpensR',
          description: 'Smart expense management — submit claims, approvals, trips and settlements.',
          theme_color: '#0f1c09',
          background_color: '#0f1c09',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/?source=pwa',
          id: 'xpensr-by-rb',
          lang: 'en-IN',
          categories: ['business', 'finance', 'productivity'],
          icons: [
            {
              src: '/pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'             // Android adaptive icon
            },
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png'
            }
          ],
          screenshots: [
            {
              src: '/pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'XpensR Dashboard'
            }
          ],
          shortcuts: [
            {
              name: 'New Expense',
              short_name: 'Expense',
              description: 'Submit a new expense claim',
              url: '/?tab=submit&source=shortcut',
              icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
            },
            {
              name: 'My Claims',
              short_name: 'Claims',
              description: 'View my expense claims',
              url: '/?tab=claims&source=shortcut',
              icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
            },
            {
              name: 'Approvals',
              short_name: 'Approve',
              description: 'Review pending approvals',
              url: '/?tab=approvals&source=shortcut',
              icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
            }
          ]
        },

        workbox: {
          // Cache strategy — network-first for API, cache-first for assets
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB max

          runtimeCaching: [
            // App shell — stale-while-revalidate
            {
              urlPattern: /^https:\/\/xpensr\.in\//,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'xpensr-shell',
                expiration: { maxAgeSeconds: 24 * 60 * 60 }
              }
            },
            // Supabase API — network-first (always fresh auth/data)
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 }
              }
            },
            // Google Fonts — cache-first (rarely changes)
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 }
              }
            },
            // Exchange rate API — network-first with 5-min cache
            {
              urlPattern: /^https:\/\/api\.exchangerate-api\.com\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'fx-rates',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 5, maxAgeSeconds: 5 * 60 }
              }
            },
            // Never cache AI or auth API calls
            {
              urlPattern: /\/api\/(anthropic|auth|email|whatsapp)/,
              handler: 'NetworkOnly'
            }
          ],

          // Skip waiting — new SW takes over immediately when deployed
          skipWaiting: true,
          clientsClaim: true,

          // Offline fallback page
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//]
        },

        devOptions: {
          enabled: false  // Disable SW in dev to avoid cache confusion
        }
      })
    ],

    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-api-key', ANTHROPIC_KEY)
              proxyReq.setHeader('anthropic-version', '2023-06-01')
              proxyReq.removeHeader('origin')
            })
          },
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split vendor chunks for better caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'supabase': ['@supabase/supabase-js'],
            'pdf': ['jspdf']
          }
        }
      }
    },
  }
})
