// Around the Clock game panel

import './panel.css';

export function createAroundTheClockPanel(container, { onNextPlayer, onEndGame }) {
  const el = document.createElement('div');
  el.className = 'atc-panel';

  // Rules summary
  const rulesLabel = document.createElement('div');
  rulesLabel.className = 'atc-rules';
  el.appendChild(rulesLabel);

  // Round indicator
  const roundLabel = document.createElement('div');
  roundLabel.className = 'atc-round';
  el.appendChild(roundLabel);

  // Scoreboard
  const scoreboard = document.createElement('div');
  scoreboard.className = 'atc-scoreboard';
  el.appendChild(scoreboard);

  // Turn info
  const turnInfo = document.createElement('div');
  turnInfo.className = 'atc-turn-info';
  el.appendChild(turnInfo);

  // Event banner (win / draw)
  const banner = document.createElement('div');
  banner.className = 'atc-banner';
  banner.hidden = true;
  el.appendChild(banner);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'atc-buttons';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'atc-btn';
  nextBtn.textContent = 'Next Player';
  nextBtn.addEventListener('click', onNextPlayer);

  const endBtn = document.createElement('button');
  endBtn.className = 'atc-btn atc-btn-end';
  endBtn.textContent = 'End Game';
  endBtn.addEventListener('click', onEndGame);

  btnRow.append(nextBtn, endBtn);
  el.appendChild(btnRow);

  container.appendChild(el);

  function formatTarget(target, state) {
    if (target > state.finalTarget) {
      return 'Done';
    }
    if (target === 21) {
      return 'Bull';
    }
    return String(target);
  }

  function formatDart(d) {
    if (d.ring === 'OUT') {
      return 'Miss';
    }
    if (d.ring === 'DBULL') {
      return 'BULL';
    }
    if (d.ring === 'SBULL') {
      return 'Bull';
    }
    const prefix = { D: 'D', T: 'T', SO: 'S', SI: 'S' }[d.ring];
    return `${prefix}${d.segment}`;
  }

  function showBanner(text, type) {
    banner.textContent = text;
    banner.className = `atc-banner atc-banner-${type}`;
    banner.hidden = false;
  }

  function buildRulesText(state) {
    const tags = [];
    if (state.bullFinish !== 'off') {
      tags.push(state.bullFinish === 'double' ? 'D-Bull finish' : 'Bull finish');
    }
    if (state.hitMode !== 'any') {
      tags.push(state.hitMode === 'doubles' ? 'Doubles' : 'Triples');
    }
    if (state.multiStep) {
      tags.push('Multi-step');
    }
    if (state.maxRounds > 0) {
      tags.push(`${state.maxRounds} rnd`);
    }
    return tags.length > 0 ? tags.join(' \u00b7 ') : '';
  }

  function update(state, event) {
    // Rules
    const rulesText = buildRulesText(state);
    rulesLabel.textContent = rulesText;
    rulesLabel.hidden = !rulesText;

    // Round
    const roundText = state.maxRounds > 0
      ? `Round ${state.round} / ${state.maxRounds}`
      : `Round ${state.round}`;
    roundLabel.textContent = roundText;

    // Scoreboard
    scoreboard.innerHTML = '';
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      const row = document.createElement('div');
      row.className = 'atc-score-row' + (i === state.currentPlayerIndex ? ' active' : '');

      const name = document.createElement('span');
      name.className = 'atc-player-name';
      name.textContent = p.name;

      const target = document.createElement('span');
      target.className = 'atc-player-target';
      target.textContent = '\u2192 ' + formatTarget(p.currentTarget, state);

      row.append(name, target);
      scoreboard.appendChild(row);
    }

    // Turn darts
    if (state.turnDarts.length > 0) {
      turnInfo.innerHTML = '';
      for (const d of state.turnDarts) {
        const span = document.createElement('span');
        span.className = d.hit ? 'atc-dart-hit' : 'atc-dart-miss';
        span.textContent = formatDart(d);
        if (turnInfo.childNodes.length > 0) {
          turnInfo.appendChild(document.createTextNode(', '));
        }
        turnInfo.appendChild(span);
      }
    } else {
      turnInfo.textContent = '';
    }

    nextBtn.disabled = state.gameOver;

    if (event === 'win') {
      showBanner(`${state.players[state.winner].name} wins!`, 'win');
    } else if (event === 'draw') {
      showBanner('Draw \u2014 round limit reached', 'draw');
    }
  }

  function destroy() {
    el.remove();
  }

  return { update, destroy };
}
