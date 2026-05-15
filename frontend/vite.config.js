import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HT Distribuidora',
        short_name: 'HT Dist',
        theme_color: '#1a1a1a',
        background_color: '#121212',
        display: 'standalone',
        icons: [
          {
            src: 'https://via.placeholder.com/192x192.png?text=HT',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://via.placeholder.com/512x512.png?text=HT',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5200',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
