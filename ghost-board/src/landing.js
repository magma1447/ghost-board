// Landing / welcome screen — the "front door" shown at / before the app boots.
// Deliberately standalone (no app imports) so the heavy app (main.js: DOM, BLE,
// audio, restore) only loads when the visitor continues. Content here is a
// placeholder to iterate on — the wordmark will become a proper logo.

import './landing.css';
import { GAMES } from './games/registry.js';

const TAGLINE = 'Play darts on your Granboard — scored, lit, and called out.';

export function renderLanding(onContinue) {
    const el = document.createElement('div');
    el.id = 'landing';
    el.className = 'landing';

    const inner = document.createElement('div');
    inner.className = 'landing-inner';

    const title = document.createElement('img');
    title.className = 'landing-title-img';
    title.src = '/images/ghost-title.svg'; // rough arcade wordmark — swap for a Recraft one
    title.alt = 'Ghost Board';
    inner.appendChild(title);

    // The board is what we're throwing at; the ghost just floats in front of it.
    const stage = document.createElement('div');
    stage.className = 'landing-stage';

    const board = document.createElement('img');
    board.className = 'landing-board';
    board.src = '/images/dartboard.svg';
    board.alt = '';
    board.setAttribute('aria-hidden', 'true');
    stage.appendChild(board);

    // Ground shadow that grows/fades as the ghost rises (animated in CSS).
    const shadow = document.createElement('div');
    shadow.className = 'landing-shadow';
    stage.appendChild(shadow);

    // Panic ghost (background stripped) with darts thrown at it — this part bobs.
    const scene = document.createElement('div');
    scene.className = 'landing-scene';

    const hero = document.createElement('img');
    hero.className = 'landing-hero';
    hero.src = '/images/ghosts/ghost-panic.svg';
    hero.alt = '';
    hero.setAttribute('aria-hidden', 'true');
    scene.appendChild(hero);

    // Three darts thrown into the ghost from different sides (a crossfire).
    const darts = [
        { src: '/images/darts/dart-4.svg', cls: 'landing-dart-a' },
        { src: '/images/darts/dart-1.svg', cls: 'landing-dart-b' },
        { src: '/images/darts/dart-5.svg', cls: 'landing-dart-c' },
    ];
    for (const d of darts) {
        const dart = document.createElement('img');
        dart.className = `landing-dart ${d.cls}`;
        dart.src = d.src;
        dart.alt = '';
        dart.setAttribute('aria-hidden', 'true');
        scene.appendChild(dart);
    }

    stage.appendChild(scene);
    inner.appendChild(stage);

    const copy = document.createElement('div');
    copy.className = 'landing-copy';

    const tagline = document.createElement('p');
    tagline.className = 'landing-tagline';
    tagline.textContent = TAGLINE;
    copy.appendChild(tagline);

    // Game count read from the registry so it stays correct as games are added.
    const subline = document.createElement('p');
    subline.className = 'landing-subline';
    subline.textContent = `${GAMES.length} unique game modes with various game-changing options.`;
    copy.appendChild(subline);

    inner.appendChild(copy);

    const enter = document.createElement('button');
    enter.className = 'landing-enter';
    enter.textContent = 'Enter';
    inner.appendChild(enter);

    el.appendChild(inner);
    document.body.appendChild(el);

    // Continue on click, or Enter / Space anywhere on the screen. Remove the key
    // listener as we leave so it doesn't linger into the app.
    function activate() {
        window.removeEventListener('keydown', onKey);
        onContinue();
    }
    function onKey(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
        }
    }
    enter.addEventListener('click', activate);
    window.addEventListener('keydown', onKey);

    enter.focus();
}
