// X01 game family (501, 301, 701, etc.)

import { calcPoints } from '../../ble/protocol.js';

export function createX01({
  startingScore = 501,
  numPlayers = 2,
  dartsPerTurn = 3,
  doubleIn = false,
  doubleOut = false,
  bullMode = '25/50',
  maxRounds = 0,
  checkoutThreshold = 170,
} = {}) {
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({ name: `Player ${i + 1}`, score: startingScore });
  }

  const state = {
    type: 'x01',
    startingScore,
    doubleIn,
    doubleOut,
    bullMode,
    maxRounds,
    players,
    currentPlayerIndex: 0,
    turnDarts: [],
    turnStartScore: startingScore,
    turnLocked: false,
    round: 1,
    gameOver: false,
    winner: null,
    opened: new Array(numPlayers).fill(!doubleIn),
  };

  // Ephemeral — tracks whether onDart already returned a turnTotal callout
  let turnTotalReturned = false;

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
    state.turnStartScore = currentPlayer().score;

    if (maxRounds > 0 && state.round > maxRounds) {
      state.gameOver = true;
      state.winner = null;
      return 'draw';
    }
    return null;
  }

  function turnTotal() {
    return state.turnDarts.reduce((sum, d) => sum + d.points, 0);
  }

  function nextPlayer() {
    const callouts = [];

    // Turn total if not already spoken after 3rd dart
    if (!turnTotalReturned && state.turnDarts.length > 0) {
      callouts.push({ type: 'turnTotal', value: turnTotal() });
    }

    const drawEvent = advancePlayer();
    turnTotalReturned = false;

    // Remaining for the incoming player
    if (!state.gameOver) {
      callouts.push({ type: 'remaining', value: currentPlayer().score });
    }

    return { state, event: drawEvent || 'switch', callouts };
  }

  function getPoints(ring, segment) {
    if (bullMode === '50/50' && ring === 'SBULL') {
      return 50;
    }
    return calcPoints(ring, segment);
  }

  function isDouble(ring) {
    return ring === 'D' || ring === 'DBULL';
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

    // Double-in: darts before first double don't score
    if (!state.opened[idx]) {
      if (isDouble(ring)) {
        state.opened[idx] = true;
      } else {
        state.turnDarts.push({ ring, segment, points: 0 });
        return { state, event: null, callouts: [] };
      }
    }

    const points = getPoints(ring, segment);
    const newScore = player.score - points;

    if (newScore < 0 || (doubleOut && newScore === 1)) {
      player.score = state.turnStartScore;
      state.turnLocked = true;
      turnTotalReturned = true; // suppress on switch
      return { state, event: 'bust', callouts: [] };
    }

    player.score = newScore;
    state.turnDarts.push({ ring, segment, points });

    if (newScore === 0) {
      if (doubleOut && !isDouble(ring)) {
        player.score = state.turnStartScore;
        state.turnLocked = true;
        turnTotalReturned = true;
        return { state, event: 'bust', callouts: [] };
      }
      state.gameOver = true;
      state.winner = state.currentPlayerIndex;
      turnTotalReturned = true;
      return { state, event: 'win', callouts: [] };
    }

    // Build callouts
    const callouts = [];
    if (state.turnDarts.length >= dartsPerTurn) {
      // 3rd dart — call turn total
      callouts.push({ type: 'turnTotal', value: turnTotal() });
      turnTotalReturned = true;
    } else if (checkoutThreshold > 0 && player.score <= checkoutThreshold) {
      callouts.push({ type: 'checkout', value: points, remaining: player.score });
    }

    return { state, event: null, callouts };
  }

  function getState() {
    return state;
  }

  function loadState(saved) {
    Object.assign(state, saved);
    turnTotalReturned = false;
  }

  return { onDart, nextPlayer, getState, loadState };
}
