import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  base: '/Claude_Public/',
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/index.html')
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      outDir: '../dist-web',
      manifest: {
        name: 'Narrative Flow Editor',
        short_name: 'NF Editor',
        description: 'Visual narrative editor for interactive stories',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})
