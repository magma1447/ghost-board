# screenshot-engine

Headless generation of the README screenshots. Drives the dev server through a
headless Chrome (Browserless) and writes PNGs to `../screenshots/` (which stays
clean — outputs only). Each screenshot is a self-contained folder here.

## Prerequisites

The dev stack must be up with the `development` profile, which starts both the
app and Browserless. It's activated by `COMPOSE_PROFILES` in `docker/.env` — copy
the example once (it's git-ignored), then bring the stack up:

```
cp docker/.env-example docker/.env
docker compose -f docker/compose.yaml up -d
```

Browserless reaches the dev server over the compose network; nothing is exposed
to the host.

## Running

Run through the `toolbox` service, **as your host user** so the generated files
aren't root-owned (the container is root by default). The toolbox reads
`HOST_UID` / `HOST_GID` for its `user:` and sets a writable `HOME` itself, so
just prefix the ids:

```
# capture every shot
HOST_UID=$(id -u) HOST_GID=$(id -g) \
  docker compose -f docker/compose.yaml run --rm toolbox node screenshot-engine/capture.mjs

# capture a subset
HOST_UID=$(id -u) HOST_GID=$(id -g) \
  docker compose -f docker/compose.yaml run --rm toolbox node screenshot-engine/capture.mjs landing team-setup

# regenerate the gameplay saved-states (see below), then capture
HOST_UID=$(id -u) HOST_GID=$(id -g) \
  docker compose -f docker/compose.yaml run --rm toolbox node screenshot-engine/generate-states.mjs
```

Tip: `alias shot='HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose -f docker/compose.yaml run --rm toolbox node'`
then `shot screenshot-engine/capture.mjs`.

## Layout

```
screenshot-engine/
  capture.mjs          # runner: discovers shot folders, seeds, steps, shoots
  generate-states.mjs  # plays each game headless → writes gameplay-*/storage.json
  <name>/
    storage.json       # localStorage to seed  → screenshots/<name>.png
    steps.mjs          # OPTIONAL clicks to reach the screen
```

## How it works

- **Seeding.** `storage.json` is a map of localStorage keys to values — mainly
  `ghost-board-settings` (players, `debug.mouseInput` so no board/Bluetooth is
  needed, prefs) and, for gameplay shots, `ghost-board-game` (a saved game). The
  app deep-merges settings over its defaults, so set only what differs.
- **Routing.** The runner loads `#/app`, which boots straight into the app and
  runs `restore()` — so a seeded `ghost-board-game` is restored into its panel
  with no clicking. A shot can override with a `"__route"` key (the landing uses
  `"/"`).
- **IP navigation.** Chrome auto-upgrades `http://app` to HTTPS and fails against
  the plaintext dev server, so the runner resolves the `app` service to its
  container IP and navigates there (Chrome doesn't upgrade IPs; Vite doesn't
  host-check them).
- **Version tag.** Stripped to bare semver (`v0.9.0`) right before each shot, so
  screenshots don't bake in the `(dev)` marker.
- **Viewport.** 1920×1080.

## Adding a screenshot

1. Create `screenshot-engine/<name>/storage.json` with the localStorage to seed.
2. If it needs interaction, add `steps.mjs`:
   ```js
   export default async function ({ page, clickText, click, settle, enterApp, chooseGame }) {
       await clickText(page, 'New Game');
       await chooseGame(page, 'X01');
       await settle(400);
   }
   ```
   Helpers: `clickText(page, text)`, `click(page, selector)`,
   `chooseGame(page, label)` (picker row), `enterApp(page)` (landing → app),
   `settle(ms)`.
3. `capture.mjs <name>` to shoot it.

For a **gameplay** shot, don't hand-write the state — add a scenario to
`generate-states.mjs` (game type, options, player count, AI level, dart count)
and re-run it. It plays the real game engine headless and writes a valid
`ghost-board-game` into the shot's `storage.json`, so states can never drift
from what the app's `loadState()` accepts — re-run whenever game logic changes.
