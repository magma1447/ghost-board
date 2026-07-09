# Changelog

Notable changes to Ghost Board, newest first. Version numbers follow [semantic versioning](https://semver.org/): new features bump the middle number, fixes bump the last.

## 0.7.3 — 2026-07-09

### Changed
- Your turn score is now called out the moment your final dart lands, instead of only when the next player starts.
- Target numbers get their own callout sound, so a target no longer sounds like a score.
- Bob's 27 now calls the target at the start of each turn, and sounds a knockout when a player is out.
- Half It now calls your running total at the end of your turn.
- Killer shows each player's status — Killer / Not armed / Out — next to their name.

### Fixed
- Killer: a player knocked back below the arming threshold now correctly loses Killer status and rebuilds — hitting your own number adds a life again, instead of costing one.

## 0.7.2 — 2026-07-09

### Fixed
- On phones and tablets the app now uses the whole screen — the status and navigation bars are hidden (immersive full-screen), instead of being left showing.

## 0.7.1 — 2026-07-09

### Fixed
- The big current-player number reads cleaner on smaller screens — its outline no longer thickens into a muddy look.

### Changed
- The build-version tag now also shows on the welcome screen.

## 0.7.0 — 2026-07-05

### Added
- **AI player support** — play against a computer opponent.
  - Beta.
  - Around the Clock only for now.
  - Skill and behaviour will keep being tuned in future releases.

## 0.6.0 — 2026-07-05

### Added
- New game: **Killer**.
- A **welcome screen** — the front door before the board, with brand art and a button (or Enter) to jump in.

### Changed
- The game picker is now a **searchable selector**.
- **End Game** returns you to the same game's setup — for a quick replay or options tweak — instead of the game picker.
- **Rematch** lets you set the player order from a pull-down.

## 0.5.1 — 2026-07-02

### Changed
- Internal maintenance to the release pipeline (refreshed build tooling). No gameplay changes.

## 0.5.0 — 2026-07-02

### Added
- New games:
  - **Scram**
  - **Half It**
  - **Bob's 27**
- A header on every game showing the game's name and a **Rules** button, so the rules are one tap away while you play.
- Idle **attract-mode lighting** — the board (and the on-screen board) show a slow rotating rainbow when no game is running, instead of solid white. A new **Idle LED animation** setting picks where it shows: board + app, board only, or off.
- Cricket now calls out your running score after each turn.

### Changed
- "Triple" is now called **treble** throughout.
- The game picker wraps across rows so all the games fit on screen.

## 0.4.0 — 2026-07-02

### Added
- New game: **Shanghai**.

## 0.3.0 — 2026-07-02

### Fixed
- The big on-board number no longer shows "0" before you've scored.

## 0.2.0 — 2026-07-01

### Added
- New games:
  - **Count Up**
  - **Score Rush**
  - **Cricket**

### Changed
- You can now set a **custom number of rounds** instead of picking from fixed choices, with a "No limit" option where it fits, in these games:
  - X01
  - Around the Clock
  - Cat and Mouse
  - Simon Says

## 0.1.0 — 2026-06-28

First playable release.

### Added
- Connects to a Granboard over Bluetooth and shows your throws on an interactive board, with the board's LEDs mirrored on screen.
- Bluetooth connection status icon, with pop-up notifications.
- Games:
  - **X01** (301 / 501 / 701 / 1001)
  - **Around the Clock**
  - **Cat and Mouse**
  - **Simon Says**
- Checkout suggestions for X01 — shown on screen and lit on the board.
- 3-dart averages for X01.
- In-app descriptions for every game and option.
- Match play — legs and sets, with a history view and a rematch button.
- Named players, 1–8 per game, with reordering; each player's turn shows in its own scoreboard block.
- On-board current-player number (can be switched off), and win / draw celebrations.
- Voice callouts and sound effects — voices sorted and labelled by language so the right one is easy to find, and working on Android.
- Choose which callouts are spoken (turn total, remaining score, checkout), and pick a sound-effect set.
- Board colour themes that mirror real Granboard models, with double/treble rings sized to match a soft-tip board.
- An adjustable interface scale.
- Undo the last dart, and a confirm before ending a game.
- A game in progress auto-saves and resumes when you reload or come back later.
- An event log of recent throws and actions.
- Collapsible setup sections — "Match format", "Game options" and the players roster fold away.
- New Game and Players moved into a top-bar menu, with back/cancel navigation.
- Reworked the main layout — the board and scoreboard swapped sides, so the scoreboard and controls lead.
- Scoreboard scrolls with the action buttons pinned — usable with a full roster.
- Ghost mascot artwork and app icons.
- Install it like an app and play offline.
- The current app version is shown in the corner.
