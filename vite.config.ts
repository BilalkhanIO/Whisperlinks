import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'WhisperLink',
          short_name: 'WhisperLink',
          description: 'Private P2P encrypted chat with AI companion. Zero logs, no accounts, instant rooms.',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          categories: ['communication', 'social', 'productivity'],
          icons: [
            { src: 'icons/icon-72.png',           sizes: '72x72',     type: 'image/png' },
            { src: 'icons/icon-96.png',           sizes: '96x96',     type: 'image/png' },
            { src: 'icons/icon-128.png',          sizes: '128x128',   type: 'image/png' },
            { src: 'icons/icon-144.png',          sizes: '144x144',   type: 'image/png' },
            { src: 'icons/icon-152.png',          sizes: '152x152',   type: 'image/png' },
            { src: 'icons/icon-192.png',          sizes: '192x192',   type: 'image/png' },
            { src: 'icons/icon-384.png',          sizes: '384x384',   type: 'image/png' },
            { src: 'icons/icon-512.png',          sizes: '512x512',   type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512',   type: 'image/png', purpose: 'maskable' },
          ],
          screenshots: [
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              label: 'WhisperLink Chat',
            },
          ],
        },
        workbox: {
          // Cache all compiled assets
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // Cache external CDN resources after first fetch
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn\.tailwindcss\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'tailwind-cdn',
                expiration: { maxEntries: 5, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
            {
              urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*\/plugins/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'tailwind-cdn' },
            },
          ],
          // Show offline page gracefully when navigation fails
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});
