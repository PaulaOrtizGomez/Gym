import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    tailwindcss(),

    VitePWA({
      registerType: 'prompt',

      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],

      manifest: {
        id: '/',

        name: 'Gym Tracker',
        short_name: 'Gym Tracker',

        description:
          'Aplicación personal para registrar entrenamientos de gimnasio de forma rápida, simple y offline.',

        theme_color: '#FFF9FC',
        background_color: '#FFF9FC',

        display: 'standalone',

        start_url: '/',
        scope: '/',

        orientation: 'portrait-primary',

        lang: 'es',

        categories: [
          'fitness',
          'health',
          'lifestyle',
        ],

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico}',
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
})