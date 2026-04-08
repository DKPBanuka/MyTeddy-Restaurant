import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.svg', 'robots.txt'],
      manifest: {
        name: 'MyTeddy Restaurant POS',
        short_name: 'MyTeddy POS',
        description: 'Next-Generation Intelligent Restaurant Management System',
        theme_color: '#1e293b',
        background_color: '#1e293b',
        display: 'standalone',
        icons: [
          {
            src: 'logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => {
              // Cache external images (Unsplash, etc) and local backend uploads
              return url.pathname.includes('/uploads/') || 
                     url.hostname.includes('unsplash.com') ||
                     url.hostname.includes('cloudinary.com');
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: 'localhost',  // Run only on localhost
    port: 5000,
  },
})
