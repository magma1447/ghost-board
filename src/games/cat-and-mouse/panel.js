// Cat and Mouse game panel

import './panel.css';

export function createCatAndMousePanel(container, { onNextPlayer, onEndGame }) {
  const el = document.createElement('div');
  el.className = 'cam-panel';

  // Rules summary
  const rulesLabel = document.createElement('div');
  rulesLabel.className = 'cam-rules';
  el.appendChild(rulesLabel);

  // Round indicator
  const roundLabel = document.createElement('div');
  roundLabel.className = 'cam-round';
  el.appendChild(roundLabel);

  // Scoreboard
  const scoreboard = document.createElement('div');
  scoreboard.className = 'cam-scoreboard';
  el.appendChild(scoreboard);

  // Turn info
  const turnInfo = document.createElement('div');
  turnInfo.className = 'cam-turn-info';
  el.appendChild(turnInfo);

  // Event banner (win / draw)
  const banner = document.createElement('div');
  banner.className = 'cam-banner';
  banner.hidden = true;
  el.appendChild(banner);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'cam-buttons';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'cam-btn';
  nextBtn.textContent = 'Next Player';
  nextBtn.addEventListener('click', onNextPlayer);

  const endBtn = document.createElement('button');
  endBtn.className = 'cam-btn cam-btn-end';
  endBtn.textContent = 'End Game';
  endBtn.addEventListener('click', onEndGame);

  btnRow.append(nextBtn, endBtn);
  el.appendChild(btnRow);

  container.appendChild(el);

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
    banner.className = `cam-banner cam-banner-${type}`;
    banner.hidden = false;
  }

  function buildRulesText(state) {
    const tags = [];
    tags.push(`Gap ${state.gap}`);
    if (state.hitMode !== 'any') {
      tags.push(state.hitMode === 'doubles' ? 'Doubles' : 'Triples');
    }
    if (state.multiStep) {
      tags.push('Multi-step');
    }
    if (state.maxRounds > 0) {
      tags.push(`${state.maxRounds} rnd`);
    }
    return tags.join(' \u00b7 ');
  }

  function update(state, event) {
    // Rules
    rulesLabel.textContent = buildRulesText(state);
    rulesLabel.hidden = false;

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
      row.className = 'cam-score-row' + (i === state.currentPlayerIndex ? ' active' : '');

      const name = document.createElement('span');
      name.className = 'cam-player-name';
      name.textContent = p.name;

      const target = document.createElement('span');
      target.className = 'cam-player-target';
      target.textContent = '\u2192 ' + p.currentTarget;

      row.append(name, target);
      scoreboard.appendChild(row);
    }

    // Turn darts
    if (state.turnDarts.length > 0) {
      turnInfo.innerHTML = '';
      for (const d of state.turnDarts) {
        const span = document.createElement('span');
        span.className = d.hit ? 'cam-dart-hit' : 'cam-dart-miss';
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
      const winner = state.players[state.winner];
      showBanner(`${winner.name} wins!`, 'win');
    } else if (event === 'draw') {
      showBanner('Draw \u2014 round limit reached', 'draw');
    }
  }

  function destroy() {
    el.remove();
  }

  return { update, destroy };
}
