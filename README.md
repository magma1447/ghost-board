# Ghost Board

Web interface for Granboard electronic dartboards. Connects via WebBluetooth and displays dart hits on an interactive board.

## Features

- Interactive SVG dartboard with real-time hit highlighting
- BLE connection to Granboard with auto-reconnect
- LED control — hit flash, player switch sweep, game-aware on/off
- Sound effects with three themes (impact, gunshot, arcade)
- Voice callouts — turn total, remaining score, checkout darts, dramatic 180 call
- Configurable voice selection via browser SpeechSynthesis
- Game state persistence — survives page refresh and BLE disconnect
- Settings stored in localStorage with gear menu
- Debug mode — mouse clicks on board simulate dart hits
- Responsive layout with mobile breakpoint

## Games

- **X01**
  - 2 players
  - Bust reverts entire turn, locks remaining darts
  - Settings remembered between sessions
  - Options:
    - Starting score (301, 501, 701, 1001)
    - Double in (default: off)
    - Double out (default: on)
    - Bull scoring — 25/50 or 50/50 (default: 25/50)
    - Max rounds (default: 20, 0 for no limit)
- **Around the Clock**
  - Hit 1 through 20 in order, optionally finishing on bull
  - 2 players
  - LED highlights target number, voice calls next target on hit
  - Wrong number plays miss sound
  - Options:
    - Bull finish — off / single bull / double bull (default: single bull)
    - Hit mode — any / doubles only / triples only (default: any)
    - Multi-step — doubles advance 2, triples advance 3 (default: off)
    - Max rounds (default: no limit)
- **Cat and Mouse**
  - Mouse runs clockwise around the board, cat chases
  - Mouse starts at 20, cat starts at 5 — mouse wins by reaching 5, cat wins by catching up
  - 2 players
  - Options:
    - Head start — 1 to 5 positions (default: 1)
    - Hit mode — any / doubles only / triples only (default: any)
    - Multi-step — doubles advance 2, triples advance 3 (default: off)
    - Max rounds (default: no limit)

## Getting Started

```bash
npm install
npm run dev
```

Or via Docker:

```bash
docker compose -f docker/compose.yml up
```

Then open `http://localhost:3501` and click **Connect** to pair with your Granboard.

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
