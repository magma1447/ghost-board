// Cat and Mouse — mouse runs, cat chases, both go clockwise

// Standard dartboard clockwise order
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export function createCatAndMouse({
  numPlayers = 2,
  dartsPerTurn = 3,
  gap = 1,
  hitMode = 'any',
  multiStep = false,
  maxRounds = 0,
} = {}) {
  function computeTarget(playerIndex, progress) {
    if (playerIndex === 0) {
      return BOARD_ORDER[progress % 20];
    }
    return BOARD_ORDER[((20 - gap) + progress) % 20];
  }

  const players = [
    { name: 'Mouse', progress: 0, currentTarget: computeTarget(0, 0) },
    { name: 'Cat', progress: 0, currentTarget: computeTarget(1, 0) },
  ];
  // Ignore numPlayers — always exactly 2
  void numPlayers;

  const state = {
    type: 'cat-and-mouse',
    gap,
    hitMode,
    multiStep,
    maxRounds,
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
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 2;
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

  function ringMatches(ring) {
    if (hitMode === 'doubles') {
      return ring === 'D';
    }
    if (hitMode === 'triples') {
      return ring === 'T';
    }
    return ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T';
  }

  function stepsForRing(ring) {
    if (!multiStep) {
      return 1;
    }
    if (ring === 'D') {
      return 2;
    }
    if (ring === 'T') {
      return 3;
    }
    return 1;
  }

  function checkCatCaught() {
    return state.players[1].progress - state.players[0].progress >= gap;
  }

  function checkMouseFinished() {
    return state.players[0].progress >= 20;
  }

  function nextPlayer() {
    const callouts = [];
    const drawEvent = advancePlayer();

    if (!state.gameOver) {
      const player = currentPlayer();
      callouts.push({ type: 'remaining', value: player.currentTarget });
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
    const idx = state.currentPlayerIndex;
    const target = player.currentTarget;

    // Check if dart hits current target
    const isHit = segment === target && ringMatches(ring);

    if (!isHit) {
      state.turnDarts.push({ ring, segment, hit: false });
      return { state, event: 'miss', callouts: [] };
    }

    // Hit — advance
    const steps = stepsForRing(ring);
    player.progress += steps;
    player.currentTarget = computeTarget(idx, player.progress);
    state.turnDarts.push({ ring, segment, hit: true });

    // Check win conditions
    if (idx === 0 && checkMouseFinished()) {
      state.gameOver = true;
      state.winner = 0;
      return { state, event: 'win', callouts: [] };
    }
    if (idx === 1 && checkCatCaught()) {
      state.gameOver = true;
      state.winner = 1;
      return { state, event: 'win', callouts: [] };
    }

    // Call out next target (not on last dart)
    const callouts = [];
    if (state.turnDarts.length < dartsPerTurn) {
      callouts.push({ type: 'checkout', value: player.currentTarget });
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
