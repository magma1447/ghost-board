# CLAUDE.md

## Tooling

- All tooling runs via Docker: `docker compose -f docker/compose.yml exec -T app <command>`
- Never run npm, eslint, or vite directly on the host
- Lint: `docker compose -f docker/compose.yml exec -T app npx eslint src/`
- Build: `docker compose -f docker/compose.yml exec -T app npx vite build`

## Code style

- 4-space indentation (enforced by ESLint)
- ES6 modules (import/export), vanilla JS, no frameworks
- Single quotes, semicolons, always use curly braces
- Descriptive function names — no abbreviations (`formatBool` not `fmtBool`)
- Comment non-obvious logic: BLE protocol details, game rules/edge cases, timing sequences

## Architecture

- Each game has its own directory under `src/games/` with: `game.js`, `setup.js`, `panel.js`
- Component CSS colocates with its component: each module side-effect imports its own stylesheet (`import './x.css'`). Only global / app-shell base styles remain in `src/style.css`. Shared panel/setup CSS lives in `src/games/game-panel.css` (`game-` class prefix)
- Shared formatting helpers live in `src/games/format.js`
- Game-specific defaults belong in each game's `setup.js`, not in global `src/state/settings.js`
- Games return `{ state, event, callouts }` from `onDart()` and `nextPlayer()`
- Game types are registered in `src/games/manager.js`
