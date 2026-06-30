import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    plugins: [
        VitePWA({
            // autoUpdate: a new build's service worker takes over on the next
            // load (skipWaiting + clientsClaim), so clients self-refresh without
            // a manual cache clear. injectRegister wires up registration for us.
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            manifest: {
                name: 'Ghost Board',
                short_name: 'Ghost Board',
                description: 'Web interface for Granboard electronic dartboards',
                theme_color: '#1a1a1a',
                background_color: '#1a1a1a',
                display: 'standalone',
                orientation: 'any',
                start_url: '/',
                icons: [
                    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
                cleanupOutdatedCaches: true,
            },
        }),
    ],
    server: {
        port: 3501,
        open: true,
    },
});
