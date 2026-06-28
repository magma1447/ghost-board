// X01 game panel — renders x01 game state

import './panel.css';

export function createX01Panel(container, { onNextPlayer, onEndGame }) {
  const el = document.createElement('div');
  el.className = 'x01-panel';

  // Rules summary
  const rulesLabel = document.createElement('div');
  rulesLabel.className = 'x01-rules';
  el.appendChild(rulesLabel);

  // Round indicator
  const roundLabel = document.createElement('div');
  roundLabel.className = 'x01-round';
  el.appendChild(roundLabel);

  // Scoreboard
  const scoreboard = document.createElement('div');
  scoreboard.className = 'x01-scoreboard';
  el.appendChild(scoreboard);

  // Turn info
  const turnInfo = document.createElement('div');
  turnInfo.className = 'x01-turn-info';
  el.appendChild(turnInfo);

  // Event banner (bust / win / draw)
  const banner = document.createElement('div');
  banner.className = 'x01-banner';
  banner.hidden = true;
  el.appendChild(banner);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'x01-buttons';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'x01-btn';
  nextBtn.textContent = 'Next Player';
  nextBtn.addEventListener('click', onNextPlayer);

  const endBtn = document.createElement('button');
  endBtn.className = 'x01-btn x01-btn-end';
  endBtn.textContent = 'End Game';
  endBtn.addEventListener('click', onEndGame);

  btnRow.append(nextBtn, endBtn);
  el.appendChild(btnRow);

  container.appendChild(el);

  let bannerTimeout = null;

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
    clearTimeout(bannerTimeout);
    banner.textContent = text;
    banner.className = `x01-banner x01-banner-${type}`;
    banner.hidden = false;
    if (type !== 'win' && type !== 'draw') {
      bannerTimeout = setTimeout(() => {
        banner.hidden = true;
      }, 2000);
    }
  }

  function buildRulesText(state) {
    const tags = [];
    if (state.doubleIn) {
      tags.push('DI');
    }
    if (state.doubleOut) {
      tags.push('DO');
    }
    if (state.bullMode === '50/50') {
      tags.push('Bull 50/50');
    }
    if (state.maxRounds > 0) {
      tags.push(`${state.maxRounds} rnd`);
    }
    return tags.length > 0 ? tags.join(' · ') : '';
  }

  function update(state, event) {
    // Rules (shown once, static)
    const rulesText = buildRulesText(state);
    rulesLabel.textContent = rulesText;
    rulesLabel.hidden = !rulesText;

    // Round
    const roundText = state.maxRounds > 0
      ? `Round ${state.round} / ${state.maxRounds}`
      : `Round ${state.round}`;
    roundLabel.textContent = roundText;

    scoreboard.innerHTML = '';
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      const row = document.createElement('div');
      row.className = 'x01-score-row' + (i === state.currentPlayerIndex ? ' active' : '');
      row.innerHTML = `<span class="x01-player-name">${p.name}</span><span class="x01-player-score">${p.score}</span>`;
      scoreboard.appendChild(row);
    }

    if (state.turnDarts.length > 0) {
      const dartStrs = state.turnDarts.map(formatDart);
      const turnTotal = state.turnDarts.reduce((sum, d) => sum + d.points, 0);
      turnInfo.textContent = `${dartStrs.join(', ')}  (${turnTotal})`;
    } else {
      turnInfo.textContent = '';
    }

    nextBtn.disabled = state.gameOver;

    if (event === 'bust') {
      showBanner('BUST!', 'bust');
    } else if (event === 'win') {
      showBanner(`${state.players[state.winner].name} wins!`, 'win');
    } else if (event === 'draw') {
      showBanner('Draw — round limit reached', 'draw');
    }
  }

  function destroy() {
    clearTimeout(bannerTimeout);
    el.remove();
  }

  return { update, destroy };
}
