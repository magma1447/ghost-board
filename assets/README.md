# assets/

Vector source art for Ghost Board's brand marks and icons. These are the
**masters**; the shipped raster icons are generated from them into `public/`.

The generator lives in [`bin/generate-icons.py`](../bin/generate-icons.py); it
defines the ghost shapes + dartboard and, in a **single run**, writes the SVG
masters below **and** rasterises them to the PNGs in `public/` (via
`rsvg-convert`) — there is no separate convert step. Run it in the dev-only
`assets` container, so no host Python/Inkscape is needed (Docker only):

```
docker compose -f docker/compose.yml run --rm toolbox python3 bin/generate-icons.py
```

## Files

- `README.md` — this file.

### `ghosts/` — reusable ghost marks (standalone, transparent SVG)

- `ghost-cool.svg` — cool ghost, sunglasses + smirk.
- `ghost-cool-grin.svg` — cool ghost, sunglasses + open grin.
- `ghost-cute.svg` — cute ghost, big eyes + blush + tongue.

### `icons/` — icon source art (cool-grin ghost on the dartboard)

- `favicon-large.svg` — normal-size ghost, dartboard shows the triples; rasterised to the large favicon (512).
- `favicon-small.svg` — bigger ghost that covers the triples (less clutter when tiny); rasterised to the 48/32/16 favicons.
- `apple-touch.svg` — large art on an opaque `#1a1a1a` square (iOS renders transparency as black); rasterised to the 180×180 apple-touch icon.
- `icon-maskable.svg` — large art inset to the ~80% safe zone on a `#1a1a1a` bleed, so Android can crop the PWA icon to any shape without clipping; rasterised to the maskable PWA icon.

## Generated output (in `public/`, not here)

- `favicon-512.png` ← `icons/favicon-large.svg`
- `favicon-48.png`, `favicon-32.png`, `favicon-16.png` ← `icons/favicon-small.svg`
- `apple-touch-icon.png` (180×180) ← `icons/apple-touch.svg`
- `icon-192.png`, `icon-512.png` (PWA install, `purpose: any`) ← `icons/favicon-large.svg`
- `icon-512-maskable.png` (PWA, `purpose: maskable`) ← `icons/icon-maskable.svg`
