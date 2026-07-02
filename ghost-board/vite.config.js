import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const PKG = fileURLToPath(new URL('./package.json', import.meta.url));

// Build a "v0.3.0 (hash)" string. The short commit hash comes from CI's
// GITHUB_SHA; locally there's no hash so it shows "dev". No git binary — the
// container neither has nor needs git.
function buildVersion() {
    const pkg = JSON.parse(readFileSync(PKG));
    const hash = (process.env.GITHUB_SHA || '').slice(0, 7) || 'dev';
    return `v${pkg.version} (${hash})`;
}

// Serve the version as a virtual module so it re-evaluates on demand. Watching
// package.json makes the label hot-update when the version changes, without a
// rebuild or server restart.
function appVersionPlugin() {
    const id = 'virtual:app-version';
    const resolved = '\0' + id;
    return {
        name: 'app-version',
        resolveId(s) { if (s === id) return resolved; },
        load(s) {
            if (s !== resolved) { return null; }
            this.addWatchFile(PKG); // hot-update the label when package.json changes
            return `export default ${JSON.stringify(buildVersion())};`;
        },
    };
}

export default defineConfig({
    root: '.',
    publicDir: 'public',
    // Vite's dep cache must live outside the read-only /app bind mount.
    cacheDir: '/node_modules/.vite',
    plugins: [
        appVersionPlugin(),
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
        // No browser in the container — don't try to auto-open (avoids xdg-open ENOENT).
        open: false,
    },
});
