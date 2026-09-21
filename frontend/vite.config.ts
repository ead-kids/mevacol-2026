import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages el sitio corre en /mevacol-2026/ (subpath del repositorio).
// VITE_BASE_URL se define como variable de entorno en el workflow de GitHub Actions.
// En desarrollo local se usa '/' para que el proxy de Vite funcione correctamente.
const base = process.env.VITE_BASE_URL || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'MEVACOL - Sistema Integral',
        short_name: 'MEVACOL',
        description: 'Sistema PWA de Inventario, Ventas y Entregas',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Separar librerías pesadas en chunks propios para reducir el bundle principal
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('recharts') || id.includes('victory-vendor') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('leaflet')) {
            return 'vendor-maps';
          }
          if (id.includes('dexie')) {
            return 'vendor-db';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
        },
      },
    },
    // Elevar el umbral de advertencia (después del code splitting el principal queda bajo 500KB)
    chunkSizeWarningLimit: 600,
  },
});

