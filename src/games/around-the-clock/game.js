// Around the Clock — hit 1 through 20 (optionally bull) in order

export function createAroundTheClock({
  numPlayers = 2,
  dartsPerTurn = 3,
  bullFinish = 'single',
  hitMode = 'any',
  multiStep = false,
  maxRounds = 0,
} = {}) {
  const finalTarget = bullFinish === 'off' ? 20 : 21; // 21 = bull

  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({ name: `Player ${i + 1}`, currentTarget: 1 });
  }

  const state = {
    type: 'around-the-clock',
    bullFinish,
    hitMode,
    multiStep,
    maxRounds,
    finalTarget,
    players,
    currentPlayerIndex: 0,
    turnDarts: [],
    turnLocked: false,
    round: 1,
    gameOver: false,
    winner: null,
  };

  function currentPlayer() {
    return state.players[state.currentPlayerIndex];
  }

  function advancePlayer() {
    state.turnDarts = [];
    state.turnLocked = false;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) {
      state.round++;
    }

    if (maxRounds > 0 && state.round > maxRounds) {
      state.gameOver = true;
      state.winner = null;
      return 'draw';
    }
    return null;
  }

  function formatTarget(target) {
    if (target <= 20) {
      return target;
    }
    // Bull — speak 25 for single, 50 for double
    return bullFinish === 'double' ? 50 : 25;
  }

  function ringMatches(ring, target) {
    // Bull target
    if (target === 21) {
      if (bullFinish === 'double') {
        return ring === 'DBULL';
      }
      // Single bull finish — accept either
      return ring === 'SBULL' || ring === 'DBULL';
    }

    // Number targets — check hit mode
    if (hitMode === 'doubles') {
      return ring === 'D';
    }
    if (hitMode === 'triples') {
      return ring === 'T';
    }
    // Any ring on the correct segment
    return ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T';
  }

  function segmentMatches(segment, target) {
    if (target === 21) {
      // Bull — segment check is handled by ringMatches
      return true;
    }
    return segment === target;
  }

  function stepsForRing(ring) {
    if (!multiStep) {
      return 1;
    }
    if (ring === 'D' || ring === 'DBULL') {
      return 2;
    }
    if (ring === 'T') {
      return 3;
    }
    return 1;
  }

  function nextPlayer() {
    const callouts = [];
    const drawEvent = advancePlayer();

    if (!state.gameOver) {
      callouts.push({ type: 'remaining', value: formatTarget(currentPlayer().currentTarget) });
    }

    return { state, event: drawEvent || 'switch', callouts };
  }

  function onDart(ring, segment) {
    if (state.gameOver) {
      return { state, event: null, callouts: [] };
    }
    if (state.turnLocked || state.turnDarts.length >= dartsPerTurn) {
      return { state, event: null, callouts: [] };
    }

    const player = currentPlayer();
    const target = player.currentTarget;

    // Check if this dart hits the current target
    const isHit = segmentMatches(segment, target) && ringMatches(ring, target);

    if (!isHit) {
      state.turnDarts.push({ ring, segment, hit: false });
      return { state, event: 'miss', callouts: [] };
    }

    // Hit — advance target
    const steps = stepsForRing(ring);
    player.currentTarget = Math.min(player.currentTarget + steps, finalTarget + 1);
    state.turnDarts.push({ ring, segment, hit: true });

    // Check win
    if (player.currentTarget > finalTarget) {
      state.gameOver = true;
      state.winner = state.currentPlayerIndex;
      return { state, event: 'win', callouts: [] };
    }

    // Call out the next target (but not on last dart — switch will handle it)
    const callouts = [];
    if (state.turnDarts.length < dartsPerTurn) {
      callouts.push({ type: 'checkout', value: formatTarget(player.currentTarget) });
    }
    return { state, event: null, callouts };
  }

  function getState() {
    return state;
  }

  function loadState(saved) {
    Object.assign(state, saved);
  }

  return { onDart, nextPlayer, getState, loadState };
}
