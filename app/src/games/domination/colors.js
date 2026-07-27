// Per-player territory colours and the board's LED paint.
//
// Each player has a panel-swatch hex and the nearest LED ring palette colour,
// kept aligned so the scoreboard matches the board. Six distinct hues — WHITE is
// reserved for the attackable frontier and OFF for neutral, so it caps at six
// before reusing. At ≥5 players the board simplifies to a two-colour "you vs.
// everyone" view (more hues blur on the diffused ring); the swatches stay
// per-player for identity in the list.

import { LED_COLOR } from '../../ble/protocol.js';

export const PLAYER_PALETTE = [
    { hex: '#ff5252', led: LED_COLOR.RED },
    { hex: '#40c4ff', led: LED_COLOR.CYAN },
    { hex: '#ffd740', led: LED_COLOR.YELLOW },
    { hex: '#b388ff', led: LED_COLOR.PURPLE },
    { hex: '#69f0ae', led: LED_COLOR.GREEN },
    { hex: '#ff9e40', led: LED_COLOR.ORANGE },
];

export function playerColor(index) {
    return PLAYER_PALETTE[index % PLAYER_PALETTE.length].hex;
}

function playerLed(index) {
    return PLAYER_PALETTE[index % PLAYER_PALETTE.length].led;
}

// Colour for the player-switch sweep: the incoming (current) player's territory
// colour, so the rotation announces whose turn it is. At ≥5 players everyone's
// own territory shows green (the two-colour view), so the sweep is green too.
export function switchColor(state) {
    return state.players.length >= 5 ? LED_COLOR.GREEN : playerLed(state.currentPlayerIndex);
}

function pushColor(map, color, num) {
    if (!map.has(color)) {
        map.set(color, []);
    }
    map.get(color).push(num);
}

function toGroups(map) {
    return [...map.entries()].map(([color, segments]) => ({ segments, color }));
}

// The LED ring as colour groups, from the current player's point of view: their
// frontier (attackable numbers) in white, owned numbers in their owner's colour,
// neutral off. During the claim phase, each claimed home shows in its colour.
// The bull has no ring LED, so it never appears here.
export function dominationGroups(state) {
    const byColor = new Map();

    if (state.phase === 'assign') {
        state.players.forEach((p, i) => {
            if (p.home !== null) {
                pushColor(byColor, playerLed(i), p.home);
            }
        });
        return toGroups(byColor);
    }

    if (state.isGameOver) {
        return [];
    }

    const me = state.currentPlayerIndex;
    const twoColour = state.players.length >= 5;
    const frontier = new Set(state.frontier);
    for (let n = 1; n <= 20; n++) {
        const owner = state.owners[n];
        if (owner === null || owner === undefined) {
            // Empty land you can move into this turn is white; other empty land off.
            if (frontier.has(n)) {
                pushColor(byColor, LED_COLOR.WHITE, n);
            }
            continue;
        }
        // Owned numbers always show their owner's colour, so the map stays
        // readable — an enemy number you can attack still reads as theirs (you
        // can tell it's attackable because it borders your colour).
        const color = twoColour ? (owner === me ? LED_COLOR.GREEN : LED_COLOR.RED) : playerLed(owner);
        pushColor(byColor, color, n);
    }
    return toGroups(byColor);
}
