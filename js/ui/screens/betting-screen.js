/**
 * Betting Screen - per-position action input on a poker table layout.
 *
 * Shows an oval table with all seats. The user inputs each opponent's
 * action in order. When it reaches the hero's seat, a "获取建议" button
 * appears.
 */
import './betting-screen.css';
import { cardToString } from '../../engine/card.js';

const STAGE_LABELS = {
  preflop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
};

const ACTION_OPTIONS = [
  { value: 'fold', label: '弃牌' },
  { value: 'check', label: '过牌' },
  { value: 'call', label: '跟注' },
  { value: 'bet', label: '下注' },
  { value: 'raise', label: '加注' },
  { value: 'allin', label: 'All-In' },
];

export function createBettingScreen(gameState, onGetAdvice) {
  const screen = document.createElement('div');
  screen.className = 'screen betting-screen';

  // -- stage badge
  const stageBadge = document.createElement('span');
  stageBadge.className = 'stage-badge';
  stageBadge.textContent = STAGE_LABELS[gameState.stage] || gameState.stage;
  screen.appendChild(stageBadge);

  // -- hero cards + board display
  const infoBar = document.createElement('div');
  infoBar.className = 'betting-info-bar';
  const holeInfo = document.createElement('span');
  holeInfo.textContent = '底牌: ' + gameState.holeCards.map(cardToString).join(' ');
  infoBar.appendChild(holeInfo);
  if (gameState.boardCards.length > 0) {
    const boardInfo = document.createElement('span');
    boardInfo.textContent = '公共牌: ' + gameState.boardCards.map(cardToString).join(' ');
    infoBar.appendChild(boardInfo);
  }
  screen.appendChild(infoBar);

  // -- pot info
  const potBar = document.createElement('div');
  potBar.className = 'pot-info';
  const potLabel = document.createElement('span');
  potLabel.innerHTML = '底池: <strong>' + gameState.pot + '</strong>';
  potBar.appendChild(potLabel);
  const callLabel = document.createElement('span');
  callLabel.innerHTML = '需跟注: <strong>' + gameState.callAmount + '</strong>';
  potBar.appendChild(callLabel);
  screen.appendChild(potBar);

  // -- table area
  const tableArea = document.createElement('div');
  tableArea.className = 'betting-table-area';
  screen.appendChild(tableArea);

  // -- action panel (shows when a seat is selected)
  const actionPanel = document.createElement('div');
  actionPanel.className = 'action-panel';
  actionPanel.style.display = 'none';
  screen.appendChild(actionPanel);

  // -- hero advice button
  const adviceBtn = document.createElement('button');
  adviceBtn.className = 'primary-btn hero-advice-btn';
  adviceBtn.textContent = '轮到你了 — 获取建议';
  adviceBtn.style.display = 'none';
  adviceBtn.addEventListener('click', async () => {
    adviceBtn.textContent = '计算中...';
    adviceBtn.disabled = true;
    try {
      await onGetAdvice(gameState);
    } catch (err) {
      console.error('计算建议出错:', err);
      adviceBtn.textContent = '计算出错，点击重试';
      adviceBtn.disabled = false;
    }
  });
  screen.appendChild(adviceBtn);

  // -- state
  const actionOrder = gameState.getActionOrder();
  const seatElements = {};

  // Track which seats still need to act in this betting round.
  // When someone raises/bets, reset all OTHER active seats to need action again.
  const needsToAct = new Set();
  for (const pos of actionOrder) {
    const seat = gameState.seats.find(s => s.position === pos);
    if (seat && seat.status !== 'folded' && seat.status !== 'allin') {
      needsToAct.add(pos);
    }
  }

  function renderTable() {
    tableArea.innerHTML = '';
    const positions = gameState.getPositions();

    // Calculate seat positions around ellipse
    positions.forEach((pos, i) => {
      const seat = gameState.seats.find(s => s.position === pos);
      const el = document.createElement('div');
      el.className = 'betting-seat';
      if (seat.isHero) el.classList.add('seat-hero');

      // Position around ellipse
      const angle = (Math.PI / 2) - (2 * Math.PI * i / positions.length);
      const cx = 50, cy = 50, rx = 42, ry = 36;
      const x = cx + rx * Math.cos(angle);
      const y = cy - ry * Math.sin(angle);
      el.style.left = x + '%';
      el.style.top = y + '%';

      const nameEl = document.createElement('span');
      nameEl.className = 'bseat-name';
      nameEl.textContent = pos;
      el.appendChild(nameEl);

      const statusEl = document.createElement('span');
      statusEl.className = 'bseat-status';
      el.appendChild(statusEl);

      tableArea.appendChild(el);
      seatElements[pos] = { el, statusEl };
    });

    // Draw the oval
    const table = document.createElement('div');
    table.className = 'betting-poker-table';
    tableArea.appendChild(table);
  }

  function updateSeats() {
    for (const seat of gameState.seats) {
      const refs = seatElements[seat.position];
      if (!refs) continue;

      refs.el.className = 'betting-seat';
      if (seat.isHero) refs.el.classList.add('seat-hero');

      if (seat.status === 'folded') {
        refs.el.classList.add('seat-folded');
        refs.statusEl.textContent = '弃牌';
      } else if (seat.status === 'allin') {
        refs.el.classList.add('seat-allin');
        refs.statusEl.textContent = 'All-In';
      } else if (seat.roundActions.length > 0) {
        // Show the last non-blind action
        const nonBlind = seat.roundActions.filter(a => a.type !== 'blind');
        if (nonBlind.length > 0) {
          const last = nonBlind[nonBlind.length - 1];
          refs.el.classList.add('seat-acted');
          refs.statusEl.textContent = formatAction(last);
        } else {
          // Only blind action
          const blindAction = seat.roundActions[0];
          refs.el.classList.add('seat-acted');
          refs.statusEl.textContent = '盲' + blindAction.amount;
        }
      } else {
        refs.statusEl.textContent = seat.isHero ? '你' : '';
      }
    }

    // Update pot display
    potLabel.innerHTML = '底池: <strong>' + gameState.pot + '</strong>';
    callLabel.innerHTML = '需跟注: <strong>' + gameState.callAmount + '</strong>';
  }

  function showActionForSeat(pos) {
    const seat = gameState.seats.find(s => s.position === pos);
    if (!seat || seat.isHero || seat.status === 'folded' || seat.status === 'allin') return;

    actionPanel.style.display = 'flex';
    actionPanel.innerHTML = '';

    const label = document.createElement('span');
    label.className = 'action-label';
    label.textContent = pos + ' 的操作:';
    actionPanel.appendChild(label);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'action-btn-group';

    for (const opt of ACTION_OPTIONS) {
      // Skip "check" if there's a bet to call
      if (opt.value === 'check' && gameState.callAmount > 0) continue;
      // Skip "call" if nothing to call
      if (opt.value === 'call' && gameState.callAmount === 0) continue;

      const btn = document.createElement('button');
      btn.className = 'action-opt-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        if (opt.value === 'bet' || opt.value === 'raise' || opt.value === 'allin') {
          showAmountInput(pos, opt.value);
        } else {
          submitAction(pos, opt.value);
        }
      });
      btnGroup.appendChild(btn);
    }

    actionPanel.appendChild(btnGroup);
    screen.appendChild(actionPanel);
  }

  function showAmountInput(pos, type) {
    actionPanel.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'action-label';
    label.textContent = pos + ' — ' + (type === 'allin' ? 'All-In 金额:' : '金额:');
    actionPanel.appendChild(label);

    const inputRow = document.createElement('div');
    inputRow.className = 'action-input-row';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'action-amount-input';
    input.placeholder = type === 'allin' ? '全部筹码' : '金额';
    input.min = '0';
    inputRow.appendChild(input);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'action-opt-btn confirm';
    confirmBtn.textContent = '确认';
    confirmBtn.addEventListener('click', () => {
      const amount = parseInt(input.value, 10);
      if (type === 'raise' && amount < gameState.callAmount * 2) {
        input.style.borderColor = '#ef4444';
        return;
      }
      if (type === 'bet' && amount < gameState.bigBlind) {
        input.style.borderColor = '#ef4444';
        return;
      }
      if (amount > 0) submitAction(pos, type, amount);
    });
    inputRow.appendChild(confirmBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'action-opt-btn';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => showActionForSeat(pos));
    inputRow.appendChild(cancelBtn);

    actionPanel.appendChild(inputRow);
  }

  function submitAction(pos, type, amount) {
    gameState.addAction({ type, amount, position: pos });
    actionPanel.style.display = 'none';

    // Update needsToAct based on action type
    if (type === 'fold') {
      needsToAct.delete(pos);
    } else if (type === 'raise' || type === 'bet') {
      // This seat acted; reset all OTHER active seats to need action again
      needsToAct.delete(pos);
      for (const otherPos of actionOrder) {
        if (otherPos === pos) continue;
        const seat = gameState.seats.find(s => s.position === otherPos);
        if (seat && seat.status !== 'folded' && seat.status !== 'allin') {
          needsToAct.add(otherPos);
        }
      }
    } else {
      // call, check — this seat is done for now
      needsToAct.delete(pos);
    }

    updateSeats();
    advanceToNext(pos);
  }

  function advanceToNext(fromPos) {
    // Find next seat that still needs to act, using actionOrder for direction
    const orderIdx = actionOrder.indexOf(fromPos);
    const startIdx = orderIdx >= 0 ? orderIdx : 0;

    for (let i = 1; i <= actionOrder.length; i++) {
      const nextPos = actionOrder[(startIdx + i) % actionOrder.length];
      if (!needsToAct.has(nextPos)) continue;
      const seat = gameState.seats.find(s => s.position === nextPos);
      if (!seat || seat.status === 'folded' || seat.status === 'allin') {
        needsToAct.delete(nextPos);
        continue;
      }
      if (seat.isHero) {
        showHeroTurn();
        return;
      }
      highlightSeat(nextPos);
      showActionForSeat(nextPos);
      return;
    }

    // No opponent needs to act — check if hero still needs to act
    if (needsToAct.has(gameState.heroPosition)) {
      showHeroTurn();
      return;
    }

    // Nobody needs to act — shouldn't happen in normal flow, fallback to hero
    showHeroTurn();
  }

  function highlightSeat(pos) {
    // Remove highlight from all
    Object.values(seatElements).forEach(refs => refs.el.classList.remove('seat-active'));
    const refs = seatElements[pos];
    if (refs) refs.el.classList.add('seat-active');
  }

  function showHeroTurn() {
    Object.values(seatElements).forEach(refs => refs.el.classList.remove('seat-active'));
    const heroRefs = seatElements[gameState.heroPosition];
    if (heroRefs) heroRefs.el.classList.add('seat-hero-turn');

    // Show hero's actual cost to call (may be 0 if already matched, e.g. BB preflop)
    const heroCall = gameState.getHeroCallAmount();
    callLabel.innerHTML = '需跟注: <strong>' + heroCall + '</strong>';

    adviceBtn.style.display = 'block';
    actionPanel.style.display = 'none';
  }

  function formatAction(action) {
    switch (action.type) {
      case 'fold': return '弃牌';
      case 'check': return '过牌';
      case 'call': return '跟注 ' + action.amount;
      case 'bet': return '下注 ' + action.amount;
      case 'raise': return '加注 ' + action.amount;
      case 'allin': return 'All-In ' + action.amount;
      default: return action.type;
    }
  }

  // -- start the flow
  renderTable();
  updateSeats();

  // Find first seat that needs to act
  let started = false;
  for (const pos of actionOrder) {
    if (!needsToAct.has(pos)) continue;
    const seat = gameState.seats.find(s => s.position === pos);
    if (!seat || seat.status === 'folded' || seat.status === 'allin') {
      needsToAct.delete(pos);
      continue;
    }
    if (seat.isHero) {
      showHeroTurn();
      started = true;
      break;
    }
    highlightSeat(pos);
    showActionForSeat(pos);
    started = true;
    break;
  }
  // If nobody needs to act, show hero turn
  if (!started) {
    showHeroTurn();
  }

  return screen;
}
