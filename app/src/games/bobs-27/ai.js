// Bob's 27 — AI aim: the round's double (it's a doubles-accuracy drill); the
// final bull round aims the bull.
import { RING_RADIUS } from '../../ai/scatter.js';

export function bobs27Aim(state) {
    if (state.target === 'bull') {
        return { segment: 25, radius: RING_RADIUS.bull };
    }
    return { segment: state.target, radius: RING_RADIUS.double };
}
