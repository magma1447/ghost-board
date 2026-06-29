# Ghost Board

Web interface for [Granboard](https://granboards.com/product-category/gran-board-3/) electronic dartboards. Connects via WebBluetooth and displays dart hits on an interactive board.

## How it works

The Granboard itself is a fairly simple device — it detects where a dart lands and has a ring of LEDs around the board, but that's it. There is no game logic, no scoring, and no display on the board itself. All of that is handled by the app it connects to.

Ghost Board is a web-based alternative to the official Granboard app. It connects to the board over Bluetooth Low Energy (BLE), receives hit events, and sends LED commands back. Everything else — game rules, scoring, sound effects, voice callouts, and the visual dartboard — runs entirely in the browser.

## Features

- Interactive SVG dartboard with real-time hit highlighting
- Named players, 1–8 per game (Cat and Mouse is always two)
- Legs & sets match play with a rotating starting player and a leg-by-leg history
- **Undo** to correct false hits (vibration/sensor glitches), and one-tap **Rematch**
- Heads-up big number on the board showing the current player's score/target
- Full-screen win / draw / leg / set celebration overlay
- BLE connection with auto-reconnect; status shown in a Bluetooth icon (red / green / yellow) with toast messages
- LED control — hit flash, player-switch sweep, target highlighting, game-aware on/off
- Sound effects with three themes (impact, gunshot, arcade)
- Voice callouts — turn total, remaining score, per-dart checkout calls; configurable voice via browser SpeechSynthesis
- Per-game rules and per-option help, with collapsible setup sections that summarise the current config
- Collapsible event-log console
- Game state persistence — survives page refresh and BLE disconnect
- Settings stored in localStorage via a gear menu
- Debug mode — mouse clicks on the board simulate dart hits
- Responsive layout with a mobile breakpoint

## Players

Games are played by **named players**, managed in a Player Configuration screen. Most games take **1–8 players** (Cat and Mouse is always two). The roster remembers who played last, enforces unique names, and lets you reorder players before starting — swap (2 players) or randomize / rotate / reverse (3+).

## Match play (legs & sets)

Any game can be played as a match rather than a single game:

- **Best-of-N legs** decides a set, and **best-of-N sets** decides the match (default is a single leg / single set, i.e. a one-off game). Sets require more than one leg.
- The **starting player rotates** each leg, carried across set boundaries. Cat and Mouse swaps the **Mouse/Cat roles** each leg so both players get equal time with the head start.
- During match play, each game's draw-preventing option is **locked** to its no-draw value — a leg must produce a winner.
- The round line shows the current **Set / Leg**, each player's card shows their **legs/sets won and rank**, and a **History** button opens the leg-by-leg breakdown.

## Games

- **X01** (301 / 501 / 701 / 1001)
  - 1–8 players
  - Bust reverts the entire turn and locks the remaining darts
  - Per-player 3-dart average
  - Checkout path suggestions for the current player (standard competition checkouts for double-out, solved otherwise)
  - Options:
    - Start score — 301 / 501 / 701 / 1001 (default: 501)
    - Double in (default: off)
    - Double out (default: on)
    - Bull scoring — 25/50 or 50/50 (default: 25/50)
    - Max rounds (default: 20, 0 for no limit)
    - Checkout calls below — spoken checkout threshold (default: 170, off to disable)
- **Around the Clock**
  - Hit 1 through 20 in order, optionally finishing on bull
  - 1–8 players
  - LED highlights the target number; voice calls the next target on a hit; a wrong number plays the miss sound
  - Options:
    - Bull finish — off / single bull / double bull (default: single bull)
    - Hit mode — any / doubles only / triples only (default: any)
    - Multi-step — doubles advance 2, triples advance 3 (default: off)
    - Max rounds (default: no limit)
- **Cat and Mouse**
  - Both players move clockwise around the 20 segments. The mouse starts at 20; the cat starts a few segments behind (the head start). The mouse wins by completing a full lap; the cat wins by catching up to or passing the mouse.
  - Exactly 2 players (Mouse vs Cat)
  - Options:
    - Head start — 1 to 5 segments (default: 1)
    - Hit mode — any / doubles only / triples only (default: any)
    - Multi-step — doubles advance 2, triples advance 3 (default: off)
    - Sprint — a perfect turn (all darts hit) earns a bonus set of darts (default: off)
    - Max rounds (default: no limit)
    - Round limit result — mouse wins or draw (default: mouse wins)
- **Simon Says**
  - Each round, Simon picks 3 unique target numbers — hit them in any order
  - All players throw at the same targets; most points after the final round wins
  - 1–8 players
  - LED highlights all remaining targets; voice announces the 3 numbers
  - Options:
    - Hit mode — any / doubles only / triples only (default: any)
    - Scoring — flat (1 point per hit) or staggered (1 / 2 / 3 for the first, second, third hit of a turn) (default: flat)
    - Rounds — 5 / 10 / 15 / 20 / no limit (default: 10)
    - On a tie — draw, or play sudden-death rounds until someone leads (default: draw)

## Getting Started

```bash
npm install
npm run dev
```

Or via Docker:

```bash
docker compose -f docker/compose.yml up
```

Then open `http://localhost:3501` and click the Bluetooth icon to pair with your Granboard.

## Secure Context

WebBluetooth only works in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). `http://localhost` counts as secure, so running the app and opening it on the **same machine** works out of the box.

Accessing the app from another device over the network (e.g. `http://192.168.1.x:3501`) over plain HTTP will **not** work — the browser blocks WebBluetooth. For that you need to serve the app over HTTPS.

## Browser Support

Ghost Board requires **WebBluetooth**, which is supported in:

- **Chrome** (desktop & Android)
- **Edge** (desktop)
- **Opera** (desktop)

Safari and Firefox do not support WebBluetooth.

### Linux

On Linux, WebBluetooth is disabled by default in Chrome. To enable it:

1. Open `chrome://flags/#enable-web-bluetooth`
2. Set the flag to **Enabled**
3. Restart Chrome

## Attribution

BLE protocol and segment mapping derived from:

- [GranBoard-with-Autodarts](https://github.com/Lennart-Jerome/GranBoard-with-Autodarts) by Lennart-Jerome — Granboard BLE protocol reverse-engineering and Autodarts integration
- [Granboard BLE Gist](https://gist.github.com/aceslick911/01a9e8edc97495a5825087de1ceee273) by aceslick911 — LED control hex codes and protocol documentation
