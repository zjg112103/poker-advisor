/**
 * Betting Screen - per-position action input on a poker table layout.
 *
 * Shows an oval table with all seats. The user inputs each opponent's
 * action in order. When it reaches the hero's seat, a "获取建议" button
 * appears. After getting advice, hero chooses their action inline,
 * and the flow continues for remaining players.
 * When the round is truly over (all acted), shows "下一轮" button.
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

const ACTION_COLORS = {
  FOLD: '#ef4444',
  CALL: '#22c55e',
  CHECK: '#3b82f6',
  RAISE: '#f59e0b',
  BET: '#f59e0b',
};

const ACTION_LABELS = {
  FOLD: '弃牌',
  CALL: '跟注',
  CHECK: '过牌',
  RAISE: '加注',
  BET: '下注',
};

const CONFIDENCE_LABELS = {
  high: '高',
  medium: '中',
  low: '低',
};

export function createBettingScreen(gameState, { onGetAdvice, onNextRound, onNewHand }) {
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
  screen.appendChild(adviceBtn);

  // -- advice result panel (inline, shown after clicking advice btn)
  const advicePanel = document.createElement('div');
  advicePanel.className = 'advice-panel';
  advicePanel.style.display = 'none';
  screen.appendChild(advicePanel);

  // -- round complete panel (shown when all players have acted)
  const roundCompletePanel = document.createElement('div');
  roundCompletePanel.className = 'round-complete-panel';
  roundCompletePanel.style.display = 'none';
  screen.appendChild(roundCompletePanel);

  // -- state
  const actionOrder = gameState.getActionOrder();
  const seatElements = {};

  // Track which seats still need to act in this betting round.
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

    positions.forEach((pos, i) => {
      const seat = gameState.seats.find(s => s.position === pos);
      const el = document.createElement('div');
      el.className = 'betting-seat';
      if (seat.isHero) el.classList.add('seat-hero');

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
        const nonBlind = seat.roundActions.filter(a => a.type !== 'blind');
        if (nonBlind.length > 0) {
          const last = nonBlind[nonBlind.length - 1];
          refs.el.classList.add('seat-acted');
          refs.statusEl.textContent = formatAction(last);
        } else {
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
      if (opt.value === 'check' && gameState.callAmount > 0) continue;
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
      needsToAct.delete(pos);
      for (const otherPos of actionOrder) {
        if (otherPos === pos) continue;
        const seat = gameState.seats.find(s => s.position === otherPos);
        if (seat && seat.status !== 'folded' && seat.status !== 'allin') {
          needsToAct.add(otherPos);
        }
      }
    } else {
      needsToAct.delete(pos);
    }

    updateSeats();
    advanceToNext(pos);
  }

  function advanceToNext(fromPos) {
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

    // Nobody needs to act — round is complete
    showRoundComplete();
  }

  function highlightSeat(pos) {
    Object.values(seatElements).forEach(refs => refs.el.classList.remove('seat-active'));
    const refs = seatElements[pos];
    if (refs) refs.el.classList.add('seat-active');
  }

  function showHeroTurn() {
    // Hide other panels
    advicePanel.style.display = 'none';
    roundCompletePanel.style.display = 'none';
    actionPanel.style.display = 'none';

    Object.values(seatElements).forEach(refs => {
      refs.el.classList.remove('seat-active');
      refs.el.classList.remove('seat-hero-turn');
    });
    const heroRefs = seatElements[gameState.heroPosition];
    if (heroRefs) heroRefs.el.classList.add('seat-hero-turn');

    // Show hero's actual cost to call
    const heroCall = gameState.getHeroCallAmount();
    callLabel.innerHTML = '需跟注: <strong>' + heroCall + '</strong>';

    adviceBtn.style.display = 'block';
    adviceBtn.textContent = '轮到你了 — 获取建议';
    adviceBtn.disabled = false;
  }

  // -- Hero advice button click handler
  adviceBtn.addEventListener('click', async () => {
    adviceBtn.textContent = '计算中...';
    adviceBtn.disabled = true;
    try {
      const result = await onGetAdvice(gameState);
      showAdviceResult(result.recommendation, result.equityData);
    } catch (err) {
      console.error('计算建议出错:', err);
      adviceBtn.textContent = '计算出错，点击重试';
      adviceBtn.disabled = false;
    }
  });

  /**
   * Show the recommendation result inline, with hero action buttons.
   */
  function showAdviceResult(recommendation, equityData) {
    adviceBtn.style.display = 'none';
    advicePanel.style.display = 'block';
    advicePanel.innerHTML = '';

    const actionKey = (recommendation.action || '').toUpperCase();
    const borderColor = ACTION_COLORS[actionKey] || '#64748b';
    const actionLabel = ACTION_LABELS[actionKey] || recommendation.action;

    // -- Recommendation card
    const recCard = document.createElement('div');
    recCard.className = 'advice-rec-card';
    recCard.style.borderColor = borderColor;

    // Recommended action
    const recAction = document.createElement('div');
    recAction.className = 'advice-rec-action';
    recAction.style.color = borderColor;
    const amount = recommendation.raiseAmount || recommendation.betAmount || recommendation.amount;
    const hasAmount = (actionKey === 'RAISE' || actionKey === 'BET') && amount;
    recAction.textContent = hasAmount ? '建议: ' + actionLabel + ' ' + amount : '建议: ' + actionLabel;
    recCard.appendChild(recAction);

    // Equity
    const eqEl = document.createElement('div');
    eqEl.className = 'advice-rec-equity';
    eqEl.textContent = '胜率: ' + formatPercent(equityData.equity);
    recCard.appendChild(eqEl);

    // Hand type
    if (equityData.handType) {
      const htEl = document.createElement('div');
      htEl.className = 'advice-rec-hand-type';
      htEl.textContent = equityData.handType;
      recCard.appendChild(htEl);
    }

    // Pot odds
    if (equityData.potOdds !== undefined && equityData.potOdds !== null) {
      const poEl = document.createElement('div');
      poEl.className = 'advice-rec-pot-odds';
      poEl.textContent = '底池赔率: ' + formatPercent(equityData.potOdds);
      recCard.appendChild(poEl);
    }

    // Reason
    if (recommendation.reason) {
      const reasonEl = document.createElement('div');
      reasonEl.className = 'advice-rec-reason';
      reasonEl.textContent = recommendation.reason;
      recCard.appendChild(reasonEl);
    }

    // Confidence
    const confidence = recommendation.confidence || 'medium';
    const confEl = document.createElement('div');
    confEl.className = 'advice-rec-confidence confidence-' + confidence.toLowerCase();
    confEl.textContent = '信心: ' + (CONFIDENCE_LABELS[confidence.toLowerCase()] || confidence);
    recCard.appendChild(confEl);

    advicePanel.appendChild(recCard);

    // -- Divider
    const divider = document.createElement('div');
    divider.className = 'advice-divider';
    divider.textContent = '你实际选择:';
    advicePanel.appendChild(divider);

    // -- Hero action buttons
    const heroBtnGroup = document.createElement('div');
    heroBtnGroup.className = 'hero-action-btn-group';

    const heroCall = gameState.getHeroCallAmount();

    for (const opt of ACTION_OPTIONS) {
      if (opt.value === 'check' && heroCall > 0) continue;
      if (opt.value === 'call' && heroCall === 0) continue;

      const btn = document.createElement('button');
      btn.className = 'hero-action-btn';

      // Highlight the recommended action
      const optKey = opt.value.toUpperCase();
      if (optKey === actionKey) {
        btn.classList.add('hero-action-recommended');
      }

      btn.textContent = opt.label;
      if (opt.value === 'call') {
        btn.textContent = '跟注 ' + heroCall;
      }

      btn.addEventListener('click', () => {
        if (opt.value === 'bet' || opt.value === 'raise' || opt.value === 'allin') {
          showHeroAmountInput(opt.value, actionKey);
        } else {
          submitHeroAction(opt.value);
        }
      });
      heroBtnGroup.appendChild(btn);
    }

    advicePanel.appendChild(heroBtnGroup);
  }

  /**
   * Show amount input for hero's bet/raise/allin.
   */
  function showHeroAmountInput(type, recommendedActionKey) {
    // Find the action button group and replace it with amount input
    const existingGroup = advicePanel.querySelector('.hero-action-btn-group');
    if (existingGroup) existingGroup.remove();

    const inputPanel = document.createElement('div');
    inputPanel.className = 'hero-amount-panel';

    const label = document.createElement('span');
    label.className = 'action-label';
    label.textContent = type === 'allin' ? 'All-In 金额:' : '金额:';
    inputPanel.appendChild(label);

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
      if (amount > 0) submitHeroAction(type, amount);
    });
    inputRow.appendChild(confirmBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'action-opt-btn';
    cancelBtn.textContent = '返回';
    cancelBtn.addEventListener('click', () => {
      // Remove amount panel, re-show action buttons — need to re-render advice
      inputPanel.remove();
      // Re-show hero turn to get advice panel back is complex,
      // simpler: just go back to hero turn without recalculating
      showHeroTurn();
    });
    inputRow.appendChild(cancelBtn);

    inputPanel.appendChild(inputRow);
    advicePanel.appendChild(inputPanel);
  }

  /**
   * Submit hero's chosen action and continue the flow.
   */
  function submitHeroAction(type, amount) {
    gameState.addAction({ type, amount, position: gameState.heroPosition });

    // Hide advice panel
    advicePanel.style.display = 'none';

    // Hero folds → hand is over, start new hand directly
    if (type === 'fold') {
      updateSeats();
      onNewHand();
      return;
    }

    // Update needsToAct based on action type (same logic as opponent)
    if (type === 'raise' || type === 'bet') {
      needsToAct.delete(gameState.heroPosition);
      for (const otherPos of actionOrder) {
        if (otherPos === gameState.heroPosition) continue;
        const seat = gameState.seats.find(s => s.position === otherPos);
        if (seat && seat.status !== 'folded' && seat.status !== 'allin') {
          needsToAct.add(otherPos);
        }
      }
    } else {
      needsToAct.delete(gameState.heroPosition);
    }

    // Remove hero turn highlight
    const heroRefs = seatElements[gameState.heroPosition];
    if (heroRefs) heroRefs.el.classList.remove('seat-hero-turn');

    updateSeats();
    advanceToNext(gameState.heroPosition);
  }

  /**
   * Show round complete panel — all players have finished acting.
   */
  function showRoundComplete() {
    adviceBtn.style.display = 'none';
    advicePanel.style.display = 'none';
    actionPanel.style.display = 'none';

    // Remove all highlights
    Object.values(seatElements).forEach(refs => {
      refs.el.classList.remove('seat-active');
      refs.el.classList.remove('seat-hero-turn');
    });

    roundCompletePanel.style.display = 'block';
    roundCompletePanel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'round-complete-title';
    title.textContent = '本轮下注结束';
    roundCompletePanel.appendChild(title);

    // Show updated pot
    const potInfo = document.createElement('div');
    potInfo.className = 'round-complete-pot';
    potInfo.textContent = '当前底池: ' + gameState.pot;
    roundCompletePanel.appendChild(potInfo);

    const btnRow = document.createElement('div');
    btnRow.className = 'round-complete-buttons';

    // "下一轮" button — only if not at river stage
    const isRiver = gameState.stage === 'river';
    if (!isRiver) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'primary-btn';
      nextBtn.style.flex = '1';
      nextBtn.textContent = '下一轮';
      nextBtn.addEventListener('click', () => onNextRound());
      btnRow.appendChild(nextBtn);
    }

    // "新一手牌" button
    const newHandBtn = document.createElement('button');
    newHandBtn.className = 'secondary-btn';
    newHandBtn.textContent = '新一手牌';
    newHandBtn.addEventListener('click', () => onNewHand());
    btnRow.appendChild(newHandBtn);

    roundCompletePanel.appendChild(btnRow);
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

  function formatPercent(value) {
    if (typeof value !== 'number' || isNaN(value)) return '-';
    return (value * 100).toFixed(1) + '%';
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
  if (!started) {
    showRoundComplete();
  }

  return screen;
}
