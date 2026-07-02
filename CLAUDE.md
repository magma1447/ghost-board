# CLAUDE.md

## Tooling

- All tooling runs via Docker: `docker compose -f docker/compose.yaml exec -T app <command>`
- Never run npm, eslint, or vite directly on the host
- Lint: `docker compose -f docker/compose.yaml exec -T app npx eslint src/`
- Build: `docker compose -f docker/compose.yaml exec -T app npx vite build`

## Code style

- 4-space indentation (enforced by ESLint)
- ES6 modules (import/export), vanilla JS, no frameworks
- Single quotes, semicolons, always use curly braces
- Descriptive function names — no abbreviations (`formatBool` not `fmtBool`)
- Comment non-obvious logic: BLE protocol details, game rules/edge cases, timing sequences

## Architecture

- The Vite app lives in `ghost-board/` (`src/`, `public/`, `index.html`, config, package files); only `docker/`, `.github/`, `bin/`, `assets/`, and docs stay at the repo root
- The dev container mounts `ghost-board/` read-only at `/app`; deps install at `/node_modules` (one level up) so Node resolves them without writing into the read-only mount
- Each game has its own directory under `src/games/` with: `game.js`, `setup.js`, `panel.js`
- Component CSS colocates with its component: each module side-effect imports its own stylesheet (`import './x.css'`). Only global / app-shell base styles remain in `src/style.css`. Shared panel/setup CSS lives in `src/games/game-panel.css` (`game-` class prefix)
- Shared formatting helpers live in `src/games/format.js`
- Game-specific defaults belong in each game's `setup.js`, not in global `src/state/settings.js`
- Games return `{ state, event, callouts }` from `onDart()` and `nextPlayer()`
- Game types are registered in `src/games/manager.js`

## Versioning & changelog

- Version lives in `ghost-board/package.json` (shown in-app; keep `package-lock.json`'s root `version` field in sync — not the dependency versions). Bump before each push: a notable feature → minor, a fix → patch.
- Maintain `CHANGELOG.md` (repo root, [Keep a Changelog](https://keepachangelog.com) style, newest version first) with a matching entry, grouped under Added / Changed / Fixed.
- Write it for a dart player, not a developer: state *what changed*, not the mechanics or game rules — "Added game: Shanghai", not how it plays (that belongs in the README / rules). Keep items short; use a bullet list for multi-item entries (e.g. several new games).
- Only give an option or fix its own line if it shipped in a *different* release than the game/feature it belongs to; otherwise it folds into that feature. A first release has no "Fixed" section.
- Avoid the word "bug" — users read anything unexpected as one; describe fixes plainly.
