// Score Rush — AI aim: go for the treble 20, the highest-scoring dart.
import { RING_RADIUS } from '../../ai/scatter.js';

export function scoreRushAim() {
    return { segment: 20, radius: RING_RADIUS.treble };
}
