// X01 game family (501, 301, 701, etc.)

import { calcPoints } from '../../ble/protocol.js';

export function createX01({ startingScore = 501, numPlayers = 2, dartsPerTurn = 3 } = {}) {
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({ name: `Player ${i + 1}`, score: startingScore });
  }

  const state = {
    type: 'x01',
    startingScore,
    players,
    currentPlayerIndex: 0,
    turnDarts: [],
    turnStartScore: startingScore,
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
    state.turnStartScore = currentPlayer().score;
  }

  function nextPlayer() {
    advancePlayer();
    return { state, event: 'switch' };
  }

  function onDart(ring, segment) {
    if (state.gameOver) {
      return { state, event: null };
    }
    if (state.turnLocked || state.turnDarts.length >= dartsPerTurn) {
      return { state, event: null };
    }

    const points = calcPoints(ring, segment);
    const player = currentPlayer();
    const newScore = player.score - points;

    if (newScore < 0) {
      // Bust: revert entire turn, lock turn, stay on same player
      player.score = state.turnStartScore;
      state.turnLocked = true;
      return { state, event: 'bust' };
    }

    player.score = newScore;
    state.turnDarts.push({ ring, segment, points });

    if (newScore === 0) {
      state.gameOver = true;
      state.winner = state.currentPlayerIndex;
      return { state, event: 'win' };
    }

    return { state, event: null };
  }

  function getState() {
    return state;
  }

  return { onDart, nextPlayer, getState };
}
