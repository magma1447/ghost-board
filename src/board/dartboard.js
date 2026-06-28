// SVG dartboard renderer

import { generateSegments, generateLabels, RADII } from './segments.js';

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

    // Background circle
    const bg = document.createElementNS(SVG_NS, 'circle');
    bg.setAttribute('cx', cx);
    bg.setAttribute('cy', cy);
    bg.setAttribute('r', RADII.BOARD + 24);
    bg.setAttribute('fill', '#2d2d2d');
    svg.appendChild(bg);

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

    return { highlight, clearHighlight, onSegmentClick };
}
