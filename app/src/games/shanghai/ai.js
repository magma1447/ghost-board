// Shanghai — AI aim: the treble of the round's number. Single x1, double x2,
// treble x3, so the treble is the top scorer (and one leg of a "shanghai" win).
import { RING_RADIUS } from '../../ai/scatter.js';

export function shanghaiAim(state) {
    return { segment: state.target, radius: RING_RADIUS.treble };
}
