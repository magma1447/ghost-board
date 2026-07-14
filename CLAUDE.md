# CLAUDE.md

## Tooling

- All tooling runs via Docker: `docker compose -f docker/compose.yaml exec -T app <command>`
- Never run npm, eslint, or vite directly on the host
- Lint: `docker compose -f docker/compose.yaml exec -T app npx eslint src/`
- Build: `docker compose -f docker/compose.yaml exec -T app npx vite build`
- Test suite (headless game simulations, run in the toolbox): `docker compose -f docker/compose.yaml run --rm toolbox node test/robustness.mjs`
- Screenshots (README images): `screenshot-engine/` — see its `README.md`. Needs the stack up (`up -d`, `development` profile starts app + Browserless).
- Toolbox commands that WRITE files (screenshots, test baselines, icon generation) must run as the host user so output isn't root-owned: prefix with `HOST_UID=$(id -u) HOST_GID=$(id -g)` (the toolbox's `user:` reads these; defaults to root when unset).

## Code style

- 4-space indentation (enforced by ESLint)
- ES6 modules (import/export), vanilla JS — no UI framework (React/Vue etc.); lean, well-established libraries are welcome and preferred over reinventing the wheel (e.g. SortableJS), just avoid bloat
- Single quotes, semicolons, always use curly braces
- Descriptive function names — no abbreviations (`formatBool` not `fmtBool`)
- Comment non-obvious logic: BLE protocol details, game rules/edge cases, timing sequences

## Architecture

- The Vite app lives in `ghost-board/` (`src/`, `public/`, `index.html`, config, package files); only `docker/`, `.github/`, `bin/`, `test/`, `assets/`, and docs stay at the repo root
- Headless tools (`bin/`, `test/`) import game logic from `src/game-engine/core/games-logic.js` — the UI-free half of the registry (factory, meta, options, AI aim); they can't import `registry.js` itself, which pulls in panels/CSS/DOM
- The dev container mounts `ghost-board/` read-only at `/app`; deps install at `/node_modules` (one level up) so Node resolves them without writing into the read-only mount
- Games and the engine that runs them are siblings under `src/`:
  - `src/games/` — one directory per game, nothing else. Each holds `game.js`, `setup.js`, `panel.js` (+ `meta.js`, `options.js`, `rules.md`, and any game-only files, e.g. `x01/checkout.js`)
  - `src/game-engine/shared/` — helpers a game's own logic imports (`game-helpers.js`, `score-engine.js`, `format.js`, `cricket-marks.js`, `board-score.js`)
  - `src/game-engine/core/` — the framework that picks, launches, and frames games (`registry.js`, `manager.js`, `match.js`, `roster.js`, `game-selector.js`, `setup-factory.js`, `panel-factory.js` + their CSS)
- Component CSS colocates with its component: each module side-effect imports its own stylesheet (`import './x.css'`). Only global / app-shell base styles remain in `src/style.css`. Shared panel/setup CSS lives in `src/game-engine/core/game-panel.css` (`game-` class prefix)
- Shared formatting helpers live in `src/game-engine/shared/format.js`
- Game-specific defaults belong in each game's `setup.js`, not in global `src/state/settings.js`
- Games return `{ state, event, callouts }` from `onDart()` and `nextPlayer()`; the shared lifecycle skeleton (rotate, round-limit, turn-end callouts) lives in `src/game-engine/shared/game-helpers.js`
- Game types are registered in `src/game-engine/core/registry.js` (`manager.js` starts/stops them)

## Versioning & changelog

- Version lives in `ghost-board/package.json` (shown in-app; keep `package-lock.json`'s root `version` field in sync — not the dependency versions). Bump before each push: a notable feature → minor, a fix → patch.
- Maintain `CHANGELOG.md` (repo root, [Keep a Changelog](https://keepachangelog.com) style, newest version first) with a matching entry, grouped under Added / Changed / Fixed.
- Write it for a dart player, not a developer: state *what changed*, not the mechanics or game rules — "Added game: Shanghai", not how it plays (that belongs in the README / rules). Keep items short; use a bullet list for multi-item entries (e.g. several new games).
- Only give an option or fix its own line if it shipped in a *different* release than the game/feature it belongs to; otherwise it folds into that feature. A first release has no "Fixed" section.
- Avoid the word "bug" — users read anything unexpected as one; describe fixes plainly.
