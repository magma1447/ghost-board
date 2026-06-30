import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Build a "v0.1.0 (hash)" string at build time. The short commit hash comes
// from CI's GITHUB_SHA, falling back to local git, then "dev" (local builds
// without git, e.g. the Docker container).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
let hash = (process.env.GITHUB_SHA || '').slice(0, 7);
if (!hash) {
    try {
        hash = execSync('git rev-parse --short HEAD').toString().trim();
    } catch {
        hash = 'dev';
    }
}
const appVersion = `v${pkg.version} (${hash})`;

export default defineConfig({
    root: '.',
    publicDir: 'public',
    define: {
        __APP_VERSION__: JSON.stringify(appVersion),
    },
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
