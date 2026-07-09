# AI opponents

`scatter.js` is the shared throw engine — it holds `AI_PROFILES` and the
board-scatter model; `ai.js` applies it to a game's chosen aim, and each game's
aim strategy lives in `src/games/<game>/ai.js`. This file is the **design
brief** — what each difficulty level should *feel* like. The constants in
`AI_PROFILES` are gut-feel and get tuned by playing, so they need a target to aim
at. That target is here.

## Difficulty scale

Levels are anchored to **human self-rating, not beatability** — level N ≈ a
player who would rate *themselves* N out of 10. A consequence worth stating
plainly: a self-rated 3 beats level 3 about **half** the time, not 90%. The two
don't both hold; self-rating wins.

| Level | Who they play like |
|-------|--------------------|
| **1** | A healthy adult beginner (no handicap) — a functional floor, not a hypothetical worst-possible human. |
| **3** | A casual player — currently the project owner's own level (see below). |
| **9** | Roughly the weakest player in a championship: excellent, not perfect. |
| **10** | Flawless — zero scatter, never misses. |

Levels 2, 4–8 interpolate between these anchors.

### The level-3 reference (owner, self-rated)

Playing 501, aiming treble-20:
- ~80–90% of darts land in the five-number cluster **20 / 1 / 5 / 18 / 12**.
- **5 and 1** (the immediate neighbours) come up almost as often as 20 itself.
- **12 and 18** are noticeably rarer; a few darts land elsewhere entirely.
- ~95% stay on the board when aiming treble-20 (mid-board), but a *lot* miss the
  board when aiming a double — because a double sits right at the edge.

## The model in one paragraph

A tight **core** (2-D Gaussian, separate `scatterHorizontal` / `scatterVertical`)
plus a **fumble** — an occasional much wider throw that forms a *fat tail* on the
bell curve. The fumble is what makes it non-Gaussian, and it's necessary: a
single Gaussian can't be both "stays on the board aiming the centre" *and*
"sprays wider than 99%-within-60 mm" — only tight-core + fat-tail does both.
Horizontal spread drives *wrong-number* misses (which stay on the board);
vertical spread drives *OUT* and *which ring*, so it doubles as the
doubles-difficulty dial.

## Tuning notes & ideas

- Every constant is gut-feel and wants a lot of play-testing; adjust by feel
  against the anchors above.
- **Record mode** (future): log ~100 real darts (numbers only, not coordinates)
  to calibrate the owner's true spread empirically instead of by eye.
- **Top-rung rethink** (future): level 10 = flawless is *superhuman* — even a
  world champion misses. Could shuffle so 10 = a real top pro (tiny scatter) and
  flawless becomes its own rung above.
- Custom, user-defined profiles are tracked in issue #68.
