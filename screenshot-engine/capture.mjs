// Headless screenshot capture for the README images.
//
// Each screenshot is a self-contained folder under screenshot-engine/<name>/:
//   storage.json  — localStorage to seed as { key: value, ... } (e.g.
//                   "ghost-board-settings", "ghost-board-game"). The app
//                   deep-merges settings over its defaults, so set only overrides
//                   (players, debug.mouseInput, ...).
//   steps.mjs     — OPTIONAL. `export default async ({ page, clickText, settle,
//                   enterApp }) => {}` — the clicks/taps to reach the screen.
//                   Omit for screens that need no interaction after seeding.
// The runner seeds storage, runs steps, strips the version tag to bare semver,
// and writes the PNG to screenshots/<name>.png (kept clean — outputs only).
//
// Needs the dev stack up with the `development` profile (app + browserless):
//   docker compose -f docker/compose.yaml up -d
// Run as your host user so output isn't root-owned (see README.md):
//   HOST_UID=$(id -u) HOST_GID=$(id -g) \
//     docker compose -f docker/compose.yaml run --rm toolbox node screenshot-engine/capture.mjs [name ...]
// With no names it captures every shot folder.

import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const BROWSERLESS_WS = process.env.BROWSERLESS_WS || 'ws://browserless:3000/chromium?token=ghostboard';
const APP_HOST = process.env.APP_HOST || 'app';
const APP_PORT = process.env.APP_PORT || '3501';
const OUT_DIR = fileURLToPath(new URL('../screenshots/', import.meta.url));
const SHOTS_DIR = fileURLToPath(new URL('.', import.meta.url));
const VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 1 };

// Chrome auto-upgrades http://<single-label-host> to HTTPS and hard-fails against
// the plaintext Vite dev server (ERR_SSL_PROTOCOL_ERROR). Navigating by IP skips
// the upgrade — and Vite exempts IP hosts from its allowedHosts check — so we
// resolve the compose service name to its container IP at runtime.
let APP_URL = process.env.APP_URL || null;

// Load the app with seeded localStorage: first paint to get the origin, clear +
// write the keys, then reload so the app boots from the seeded state. clear()
// keeps shots isolated (no saved game leaking from a previous one).
//
// Route: `#/app` boots straight into the app (and runs restore(), which loads a
// seeded ghost-board-game) — so in-app shots skip the landing entirely. A shot
// can opt out with a "__route" key in storage.json (the landing uses "/").
async function seed(page, storage) {
    const store = { ...storage };
    const route = store.__route || '#/app';
    delete store.__route;
    const url = APP_URL + route;
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.evaluate((keys) => {
        localStorage.clear();
        for (const [k, v] of Object.entries(keys)) {
            localStorage.setItem(k, JSON.stringify(v));
        }
    }, store);
    await page.reload({ waitUntil: 'networkidle2' });
}

// Keep just the semantic version on the build tag — drop the " (dev)" / hash
// suffix so screenshots don't bake in a dev marker.
async function stripVersion(page) {
    await page.evaluate(() => {
        const el = document.querySelector('.version-tag');
        if (el) {
            const m = el.textContent.match(/v?\d+\.\d+\.\d+/);
            if (m) {
                el.textContent = m[0];
            }
        }
    });
}

async function shoot(page, name) {
    // Strip the version tag here, right before the shot — screens reached after
    // "Enter" build their own tag, so stripping earlier wouldn't stick.
    await stripVersion(page);
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
    console.log(`  shot -> screenshots/${name}.png`);
}

// Small settle for fonts / animations before a shot.
const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Click the clickable element whose trimmed text equals `text` (falling back to
// a contains-match). Covers the app's buttons and button-like controls.
async function clickText(page, text) {
    const handle = await page.evaluateHandle((wanted) => {
        const clickable = [...document.querySelectorAll('button, a, [role="button"], .btn')];
        return clickable.find((el) => el.textContent.trim() === wanted)
            || clickable.find((el) => el.textContent.trim().includes(wanted))
            || null;
    }, text);
    const el = handle.asElement();
    if (!el) {
        throw new Error(`clickText: no clickable element for "${text}"`);
    }
    await el.click();
}

// Landing screen -> into the app proper (past the "Enter" gate).
async function enterApp(page) {
    await clickText(page, 'Enter');
    await settle(400);
}

// Click the first element matching a CSS selector (e.g. '[title="Settings"]').
async function click(page, selector) {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.click(selector);
}

// Debug-mode "throw": synthesise a click on a board segment (by data-ring /
// data-segment), firing the same hit handler a real tap would — e.g. to land a
// finishing dart and trigger the win overlay.
async function clickSegment(page, ring, segment) {
    await page.$eval(
        `[data-ring="${ring}"][data-segment="${segment}"]`,
        (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
}

// Click the "Choose" button in the picker row for a given game label.
async function chooseGame(page, label) {
    const handle = await page.evaluateHandle((wanted) => {
        const row = [...document.querySelectorAll('.game-selector-row')].find((r) => {
            const n = r.querySelector('.game-selector-name');
            return n?.textContent.trim() === wanted;
        });
        return row ? row.querySelector('.game-selector-play') : null;
    }, label);
    const el = handle.asElement();
    if (!el) {
        throw new Error(`chooseGame: no picker row for "${label}"`);
    }
    await el.click();
}

// Shot folders: any subdir of shots/ holding a storage.json.
function listShots() {
    return fs.readdirSync(SHOTS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(SHOTS_DIR, e.name, 'storage.json')))
        .map((e) => e.name)
        .sort();
}

async function runShot(browser, name) {
    const dir = path.join(SHOTS_DIR, name);
    const storage = JSON.parse(fs.readFileSync(path.join(dir, 'storage.json'), 'utf8'));
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await seed(page, storage);
    const stepsPath = path.join(dir, 'steps.mjs');
    if (fs.existsSync(stepsPath)) {
        const mod = await import(pathToFileURL(stepsPath).href);
        await mod.default({ page, clickText, click, clickSegment, settle, enterApp, chooseGame });
    }
    await settle(700); // let a restored game's target-LED sweep and fonts settle
    await shoot(page, name);
    await page.close();
}

async function main() {
    if (!APP_URL) {
        const { address } = await dns.lookup(APP_HOST);
        APP_URL = `http://${address}:${APP_PORT}`;
    }
    console.log(`app: ${APP_URL}`);
    const names = process.argv.slice(2);
    const todo = names.length ? names : listShots();
    const browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS_WS });
    try {
        for (const name of todo) {
            console.log(`shot: ${name}`);
            await runShot(browser, name);
        }
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
