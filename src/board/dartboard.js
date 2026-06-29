// SVG dartboard renderer

import { generateSegments, generateLabels, generateLedArcs, LED_RING, RADII } from './segments.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const HIGHLIGHT_COLOR = '#ffff00';
const HIGHLIGHT_OPACITY = '0.7';

export function createDartboard(container) {
    const size = 420;
    const cx = size / 2;
    const cy = size / 2;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'dartboard');

    // Diffuse blur for the LED ring — smooths the per-number arcs into each
    // other, like light spreading through the board's acrylic.
    const defs = document.createElementNS(SVG_NS, 'defs');
    const diffuse = document.createElementNS(SVG_NS, 'filter');
    diffuse.setAttribute('id', 'led-diffuse');
    diffuse.setAttribute('x', '-20%');
    diffuse.setAttribute('y', '-20%');
    diffuse.setAttribute('width', '140%');
    diffuse.setAttribute('height', '140%');
    const blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '4');
    diffuse.appendChild(blur);
    defs.appendChild(diffuse);

    // One radial gradient per LED colour: transparent at the inner edge of the
    // ring, bright at the outer edge — the LEDs sit on the bezel and shine
    // inward, so they're strongest at the border and fade toward the doubles.
    const LED_PALETTE = {
        red: '#ff3030', orange: '#ff9a2e', yellow: '#ffe23d', green: '#2bd45a',
        cyan: '#21d0d0', purple: '#9b6bff', white: '#f0f0f0',
    };
    const innerOffset = (LED_RING.inner / LED_RING.outer).toFixed(3);
    for (const [name, hex] of Object.entries(LED_PALETTE)) {
        const grad = document.createElementNS(SVG_NS, 'radialGradient');
        grad.setAttribute('id', `led-${name}`);
        grad.setAttribute('gradientUnits', 'userSpaceOnUse');
        grad.setAttribute('cx', cx);
        grad.setAttribute('cy', cy);
        grad.setAttribute('r', LED_RING.outer);
        const s1 = document.createElementNS(SVG_NS, 'stop');
        s1.setAttribute('offset', innerOffset);
        s1.setAttribute('stop-color', hex);
        s1.setAttribute('stop-opacity', '0');
        const s2 = document.createElementNS(SVG_NS, 'stop');
        s2.setAttribute('offset', '1');
        s2.setAttribute('stop-color', hex);
        s2.setAttribute('stop-opacity', '0.95');
        grad.append(s1, s2);
        defs.appendChild(grad);
    }
    svg.appendChild(defs);

    // Background circle (bezel)
    const bg = document.createElementNS(SVG_NS, 'circle');
    bg.setAttribute('cx', cx);
    bg.setAttribute('cy', cy);
    bg.setAttribute('r', RADII.BOARD + 26);
    bg.setAttribute('fill', '#2d2d2d');
    svg.appendChild(bg);

    // Simulated RGB LED ring — diffused per-number arcs, strongest at the outer
    // border and fading toward the doubles (mirrors the physical board's
    // acrylic-diffused ring). One arc per number, off (transparent) until the
    // LED controller lights it; off segments render nothing.
    const ledArcs = {}; // number → arc element
    const ledGroup = document.createElementNS(SVG_NS, 'g');
    ledGroup.setAttribute('filter', 'url(#led-diffuse)');
    for (const arc of generateLedArcs(cx, cy)) {
        const seg = document.createElementNS(SVG_NS, 'path');
        seg.setAttribute('d', arc.path);
        seg.setAttribute('fill', 'none');
        seg.setAttribute('pointer-events', 'none');
        ledGroup.appendChild(seg);
        ledArcs[arc.num] = seg;
    }
    svg.appendChild(ledGroup);

    // Segment elements, keyed for highlight lookup
    const elements = {};
    const segments = generateSegments(cx, cy);

    for (const seg of segments) {
        let el;
        if (seg.circle) {
            el = document.createElementNS(SVG_NS, 'circle');
            el.setAttribute('cx', seg.circle.cx);
            el.setAttribute('cy', seg.circle.cy);
            el.setAttribute('r', seg.circle.r);
        } else {
            el = document.createElementNS(SVG_NS, 'path');
            el.setAttribute('d', seg.path);
        }
        el.setAttribute('fill', seg.fill);
        el.setAttribute('stroke', '#c0c0c0');
        el.setAttribute('stroke-width', '0.5');
        el.setAttribute('data-ring', seg.ring);
        el.setAttribute('data-segment', seg.segment);
        el.dataset.originalFill = seg.fill;
        svg.appendChild(el);
        elements[seg.id] = el;
    }

    // Number labels
    const labels = generateLabels(cx, cy);
    for (const label of labels) {
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', label.x);
        text.setAttribute('y', label.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-family', 'sans-serif');
        text.textContent = label.num;
        svg.appendChild(text);
    }

    container.appendChild(svg);

    // Map ring type codes to element ID prefixes
    const ringToPrefix = {
        D: 'd',
        SO: 'so',
        T: 't',
        SI: 'si',
        SBULL: 'sbull',
        DBULL: 'dbull',
    };

    let activeHighlight = null;

    function highlight(ring, segment) {
        clearHighlight();

        let id;
        if (ring === 'SBULL') {
            id = 'sbull';
        } else if (ring === 'DBULL') {
            id = 'dbull';
        } else {
            id = `${ringToPrefix[ring]}-${segment}`;
        }

        const el = elements[id];
        if (!el) {
            return;
        }

        el.setAttribute('fill', HIGHLIGHT_COLOR);
        el.setAttribute('fill-opacity', HIGHLIGHT_OPACITY);
        activeHighlight = el;
    }

    function clearHighlight() {
        if (activeHighlight) {
            activeHighlight.setAttribute('fill', activeHighlight.dataset.originalFill);
            activeHighlight.removeAttribute('fill-opacity');
            activeHighlight = null;
        }
    }

    // Click-to-hit support (debug mode)
    let clickHandler = null;

    svg.addEventListener('click', (e) => {
        if (!clickHandler) {
            return;
        }
        const target = e.target.closest('[data-ring]');
        if (!target) {
            return;
        }
        const ring = target.dataset.ring;
        const segment = parseInt(target.dataset.segment, 10);
        clickHandler({ ring, segment });
    });

    function onSegmentClick(fn) {
        clickHandler = fn;
    }

    // --- LED output: renders LED state from the LED controller onto the ring ---
    const LED_NAMES = [null, 'red', 'orange', 'yellow', 'green', 'cyan', 'purple', 'white'];
    const ledFlashTimers = {};
    let ledLastRing = new Array(20).fill(0);

    function ledFill(index) {
        return index > 0 && LED_NAMES[index] ? `url(#led-${LED_NAMES[index]})` : 'none';
    }

    function setLedArc(number, index) {
        const el = ledArcs[number];
        if (el) {
            el.setAttribute('fill', ledFill(index));
        }
    }

    const leds = {
        // colors: 20 palette indices, one per number (1–20)
        ring(colors) {
            ledLastRing = colors;
            for (let j = 0; j < 20; j++) {
                setLedArc(j + 1, colors[j] || 0);
            }
        },
        // Brief flash of the hit number, then back to the ring state. Bull has
        // no ring LED, so it's not shown here.
        hit(ring, segment) {
            const el = ledArcs[segment];
            if (ring === 'SBULL' || ring === 'DBULL' || !el) {
                return;
            }
            clearTimeout(ledFlashTimers[segment]);
            el.setAttribute('fill', 'url(#led-red)');
            ledFlashTimers[segment] = setTimeout(() => {
                setLedArc(segment, ledLastRing[segment - 1] || 0);
            }, 200);
        },
    };

    return { highlight, clearHighlight, onSegmentClick, leds };
}
