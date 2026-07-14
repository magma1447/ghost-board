// Half It — AI aim: hit the round's target for the most points (miss it with all
// three darts and your score is halved). A number scores face x ring and any ring
// on it counts, so aim its treble — the max, and still a hit if it lands single.
// The ring rounds aim the top double / treble / the bull.
import { RING_RADIUS } from '../../ai/scatter.js';

export function halfItAim(state) {
    const { target } = state;
    if (target === 'double') {
        return { segment: 20, radius: RING_RADIUS.double }; // any double counts; D20 = 40
    }
    if (target === 'treble') {
        return { segment: 20, radius: RING_RADIUS.treble }; // any treble counts; T20 = 60
    }
    if (target === 'bull') {
        return { segment: 25, radius: RING_RADIUS.bull };
    }
    return { segment: target, radius: RING_RADIUS.treble }; // a number: its treble is the max
}
