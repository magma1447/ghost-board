#!/usr/bin/env python3
"""Generate Ghost Board's brand marks and PWA icons.

Masters (SVG, vector) are written to assets/; the shipped PWA icons (PNG) are
rasterised into public/ via Inkscape. The mark is a cute "cool" ghost (shades)
on the dartboard. Re-run after tweaking; requires `inkscape` on PATH.

    python3 assets/generate-icons.py
"""
import os
import math
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PUBLIC = os.path.join(ROOT, 'public')

GHOST = '#f6f6f8'
OUTLINE = '#1a1a2a'
EYE = '#22223a'
BLUSH = '#ff8aa0'
TONGUE = '#ff5d73'
BG = '#1a1a1a'
BODY_WIDTH = 1.35  # body widening factor (1.0 = slim); chosen design width

# Ghost body as data (centre x=75); widened around the centre by BODY_WIDTH.
_SLIM = [('M', 26, 212), ('C', 14, 200, 16, 150, 20, 116), ('C', 25, 62, 46, 16, 75, 16),
         ('C', 104, 16, 125, 62, 130, 116), ('C', 134, 150, 136, 200, 124, 212),
         ('C', 116, 224, 110, 214, 102, 224), ('C', 92, 236, 82, 218, 75, 226),
         ('C', 68, 234, 58, 218, 48, 224), ('C', 40, 228, 34, 222, 26, 212), ('Z',)]


def body_path(f=BODY_WIDTH, cx=75):
    out = []
    for seg in _SLIM:
        chunk = seg[0]
        nums = seg[1:]
        for i in range(0, len(nums), 2):
            chunk += f'{cx + (nums[i] - cx) * f:.1f},{nums[i+1]:.1f} '
        out.append(chunk.strip())
    return ' '.join(out)


def cute_face(cx, cy, s):
    ew, er, ex, ey = 15 * s, 7.5 * s, 15 * s, -4 * s
    return (
        f'<circle cx="{cx-ex:.1f}" cy="{cy+ey:.1f}" r="{ew:.1f}" fill="#fff"/>'
        f'<circle cx="{cx+ex:.1f}" cy="{cy+ey:.1f}" r="{ew:.1f}" fill="#fff"/>'
        f'<circle cx="{cx-ex:.1f}" cy="{cy+ey+2*s:.1f}" r="{er:.1f}" fill="{EYE}"/>'
        f'<circle cx="{cx+ex:.1f}" cy="{cy+ey+2*s:.1f}" r="{er:.1f}" fill="{EYE}"/>'
        f'<circle cx="{cx-ex+2.5*s:.1f}" cy="{cy+ey-1.5*s:.1f}" r="{2.4*s:.1f}" fill="#fff"/>'
        f'<circle cx="{cx+ex+2.5*s:.1f}" cy="{cy+ey-1.5*s:.1f}" r="{2.4*s:.1f}" fill="#fff"/>'
        f'<ellipse cx="{cx-20*s:.1f}" cy="{cy+15*s:.1f}" rx="{6.5*s:.1f}" ry="{4*s:.1f}" fill="{BLUSH}" opacity="0.8"/>'
        f'<ellipse cx="{cx+20*s:.1f}" cy="{cy+15*s:.1f}" rx="{6.5*s:.1f}" ry="{4*s:.1f}" fill="{BLUSH}" opacity="0.8"/>'
        f'<path d="M{cx-8*s:.1f},{cy+11*s:.1f} Q{cx:.1f},{cy+22*s:.1f} {cx+8*s:.1f},{cy+11*s:.1f}" '
        f'fill="none" stroke="{EYE}" stroke-width="{3.4*s:.1f}" stroke-linecap="round"/>'
        f'<path d="M{cx-5*s:.1f},{cy+14*s:.1f} Q{cx:.1f},{cy+23*s:.1f} {cx+5*s:.1f},{cy+14*s:.1f} Z" fill="{TONGUE}"/>'
    )


def cool_face(cx, cy, s):
    Lw, Lh, g = 21 * s, 15 * s, 7 * s
    lx = g / 2 + Lw
    top = cy - Lh / 2
    glint = (lambda ox: f'<line x1="{cx+ox-Lw*0.7:.1f}" y1="{top+Lh*0.7:.1f}" '
             f'x2="{cx+ox-Lw*0.25:.1f}" y2="{top+Lh*0.2:.1f}" stroke="#fff" '
             f'stroke-width="{2.6*s:.1f}" stroke-linecap="round" opacity="0.85"/>')
    glasses = (
        f'<g transform="rotate(-7 {cx} {cy})">'
        f'<rect x="{cx-lx-2*s:.1f}" y="{top-5*s:.1f}" width="{2*lx+4*s:.1f}" height="{7*s:.1f}" rx="{3*s:.1f}" fill="{EYE}"/>'
        f'<rect x="{cx-lx:.1f}" y="{top:.1f}" width="{Lw:.1f}" height="{Lh:.1f}" rx="{6*s:.1f}" fill="{EYE}"/>'
        f'<rect x="{cx+g/2:.1f}" y="{top:.1f}" width="{Lw:.1f}" height="{Lh:.1f}" rx="{6*s:.1f}" fill="{EYE}"/>'
        f'<rect x="{cx-g/2-1*s:.1f}" y="{top+1*s:.1f}" width="{g+2*s:.1f}" height="{4*s:.1f}" rx="{2*s:.1f}" fill="{EYE}"/>'
        f'<line x1="{cx-lx:.1f}" y1="{top:.1f}" x2="{cx-lx-7*s:.1f}" y2="{top-3*s:.1f}" stroke="{EYE}" stroke-width="{3.5*s:.1f}" stroke-linecap="round"/>'
        f'<line x1="{cx+lx:.1f}" y1="{top:.1f}" x2="{cx+lx+7*s:.1f}" y2="{top-3*s:.1f}" stroke="{EYE}" stroke-width="{3.5*s:.1f}" stroke-linecap="round"/>'
        f'{glint(-g/2-Lw/2)}{glint(g/2+Lw/2)}</g>'
    )
    smirk = (f'<path d="M{cx-13*s:.1f},{cy+17*s:.1f} Q{cx-2*s:.1f},{cy+26*s:.1f} {cx+15*s:.1f},{cy+13*s:.1f}" '
             f'fill="none" stroke="{EYE}" stroke-width="{3.4*s:.1f}" stroke-linecap="round"/>')
    return glasses + smirk


def ghost(face, transform):
    return (f'<g transform="{transform}">'
            f'<path d="{body_path()}" fill="{GHOST}" stroke="{OUTLINE}" '
            f'stroke-width="5.5" stroke-linejoin="round"/>{face}</g>')


def board(S, cx, cy):
    R = S / 2

    def pt(r, a):
        rad = math.radians(a)
        return cx + r * math.cos(rad), cy + r * math.sin(rad)

    def wedge(r, a0, a1, fill):
        x0, y0 = pt(r, a0)
        x1, y1 = pt(r, a1)
        return (f'<path d="M{cx},{cy} L{x0:.1f},{y0:.1f} '
                f'A{r:.1f},{r:.1f} 0 0 1 {x1:.1f},{y1:.1f} Z" fill="{fill}"/>')

    rdo, rdi, rto, rti = R * 0.99, R * 0.86, R * 0.60, R * 0.50
    parts = []
    for i in range(20):
        a0 = -90 - 9 + i * 18
        a1 = a0 + 18
        single = '#1a1a1a' if i % 2 == 0 else '#ececec'
        multi = '#c41e30' if i % 2 == 0 else '#1f9b4e'
        parts += [wedge(rdo, a0, a1, multi), wedge(rdi, a0, a1, single),
                  wedge(rto, a0, a1, multi), wedge(rti, a0, a1, single)]
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="{R*0.10:.1f}" fill="#1f9b4e"/>')
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="{R*0.045:.1f}" fill="#c41e30"/>')
    return ''.join(parts)


def svg_doc(inner, S=512, bg=None):
    rect = f'<rect width="{S}" height="{S}" fill="{bg}"/>' if bg else ''
    return ('<svg xmlns="http://www.w3.org/2000/svg" '
            f'width="{S}" height="{S}" viewBox="0 0 {S} {S}">{rect}{inner}</svg>')


def write(path, text):
    with open(path, 'w') as f:
        f.write(text)
    return path


def rasterize(svg_path, png_path, size):
    subprocess.run(['inkscape', svg_path, '-w', str(size), '-h', str(size), '-o', png_path],
                   check=True, capture_output=True)


# --- Masters (assets/) ---------------------------------------------------
icon_inner = board(512, 256, 256) + ghost(cool_face(75, 96, 1.0), 'translate(140,72) scale(1.55)')
icon_svg = write(os.path.join(HERE, 'icon.svg'), svg_doc(icon_inner))
# maskable/opaque: same art inset on a solid background so it fills the bleed
masked_svg = write(os.path.join(HERE, 'icon-maskable.svg'),
                   svg_doc(f'<g transform="translate(41,41) scale(0.84)">{icon_inner}</g>', bg=BG))
write(os.path.join(HERE, 'ghost-cool.svg'),
      svg_doc(ghost(cool_face(75, 96, 1.0), 'translate(128,40) scale(1.75)')))
write(os.path.join(HERE, 'ghost-cute.svg'),
      svg_doc(ghost(cute_face(75, 100, 1.0), 'translate(128,40) scale(1.75)')))

# --- Shipped PWA icons (public/) -----------------------------------------
rasterize(icon_svg, os.path.join(PUBLIC, 'icon-192.png'), 192)
rasterize(icon_svg, os.path.join(PUBLIC, 'icon-512.png'), 512)
rasterize(icon_svg, os.path.join(PUBLIC, 'favicon.png'), 48)
rasterize(masked_svg, os.path.join(PUBLIC, 'icon-512-maskable.png'), 512)
rasterize(masked_svg, os.path.join(PUBLIC, 'apple-touch-icon.png'), 180)
print('Wrote masters to assets/ and icons to public/')
