/**
 * Betting Screen - displays current game state and lets user add actions.
 * Shows stage badge, hole/board cards, pot info, action rows, and get-advice button.
 */
import './betting-screen.css';
import { cardToString } from '../../engine/card.js';
import { STAGES } from '../game-tracker.js';

const STAGE_LABELS = {
  preflop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
};

const ACTION_OPTIONS = [
  { value: 'fold', label: '弃牌' },
  { value: 'call', label: '跟注' },
  { value: 'raise', label: '加注' },
  { value: 'allin', label: 'All-In' },
];

const AUTO_SUBMIT_TYPES = new Set(['fold', 'call']);

/**
 * Create the betting screen element.
 * @param {import('../game-tracker.js').GameState} gameState
 * @param {(gameState: import('../game-tracker.js').GameState) => void} onGetAdvice
 * @returns {HTMLDivElement}
 */
export function createBettingScreen(gameState, onGetAdvice) {
  const screen = document.createElement('div');
  screen.className = 'screen betting-screen';

  // -- stage badge ----------------------------------------------------------
  const stageBadge = document.createElement('span');
  stageBadge.className = 'stage-badge';
  stageBadge.textContent = STAGE_LABELS[gameState.stage] || gameState.stage;
  screen.appendChild(stageBadge);

  // -- hole cards display ---------------------------------------------------
  const holeDisplay = document.createElement('div');
  holeDisplay.className = 'hole-cards-display';
  holeDisplay.textContent = '底牌: ' + gameState.holeCards.map(cardToString).join(' ');
  screen.appendChild(holeDisplay);

  // -- board cards display --------------------------------------------------
  const boardDisplay = document.createElement('div');
  boardDisplay.className = 'board-display';
  boardDisplay.textContent = gameState.boardCards.length > 0
    ? '公共牌: ' + gameState.boardCards.map(cardToString).join(' ')
    : '公共牌: -';
  screen.appendChild(boardDisplay);

  // -- pot info bar ---------------------------------------------------------
  const potInfo = document.createElement('div');
  potInfo.className = 'pot-info';

  const potLabel = document.createElement('span');
  potLabel.innerHTML = '底池: <strong>' + gameState.pot + '</strong>';
  potInfo.appendChild(potLabel);

  const callLabel = document.createElement('span');
  callLabel.innerHTML = '需要跟注: <strong>' + gameState.callAmount + '</strong>';
  potInfo.appendChild(callLabel);

  screen.appendChild(potInfo);

  // -- actions section ------------------------------------------------------
  const actionsSection = document.createElement('div');
  actionsSection.className = 'actions-section';
  screen.appendChild(actionsSection);

  // Track submitted action rows
  const actionRows = [];

  function addActionRow() {
    const row = createActionRow(gameState, (action) => {
      gameState.addAction(action);
      lockRow(row);
      updatePotInfo();
    });
    actionRows.push(row);
    actionsSection.appendChild(row);
  }

  // Initial action row
  addActionRow();

  // -- add action button ----------------------------------------------------
  const addBtn = document.createElement('button');
  addBtn.className = 'add-action-btn';
  addBtn.textContent = '+ 添加操作';
  addBtn.addEventListener('click', () => {
    addActionRow();
  });
  screen.appendChild(addBtn);

  // -- get advice button ----------------------------------------------------
  const adviceBtn = document.createElement('button');
  adviceBtn.className = 'primary-btn';
  adviceBtn.textContent = '获取建议';
  adviceBtn.addEventListener('click', () => {
    onGetAdvice(gameState);
  });
  screen.appendChild(adviceBtn);

  // -- helpers --------------------------------------------------------------

  function updatePotInfo() {
    potLabel.innerHTML = '底池: <strong>' + gameState.pot + '</strong>';
    callLabel.innerHTML = '需要跟注: <strong>' + gameState.callAmount + '</strong>';
  }

  return screen;
}

/**
 * Create a single action row with dropdown and amount input.
 * @param {import('../game-tracker.js').GameState} gameState
 * @param {(action: { type: string, amount?: number }) => void} onSubmit
 * @returns {HTMLDivElement}
 */
function createActionRow(gameState, onSubmit) {
  const row = document.createElement('div');
  row.className = 'action-row';

  // Action type dropdown
  const typeSelect = document.createElement('select');
  typeSelect.className = 'action-type';

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '选择操作';
  defaultOpt.disabled = true;
  defaultOpt.selected = true;
  typeSelect.appendChild(defaultOpt);

  for (const opt of ACTION_OPTIONS) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    typeSelect.appendChild(option);
  }

  // Amount input
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.className = 'action-amount';
  amountInput.placeholder = '金额';
  amountInput.disabled = true;
  amountInput.min = '0';

  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    const needsAmount = (type === 'raise' || type === 'allin');

    amountInput.disabled = !needsAmount;

    if (needsAmount) {
      // For allin, pre-fill with pot-size estimate; for raise, leave blank
      if (type === 'allin') {
        amountInput.placeholder = '全部';
      } else {
        amountInput.placeholder = '金额';
      }
      amountInput.focus();
    } else {
      // Auto-submit for fold and call
      if (type === 'call') {
        onSubmit({ type, amount: gameState.callAmount });
      } else {
        onSubmit({ type });
      }
    }
  });

  // Submit button for raise/allin (clicking enter in amount field)
  amountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const type = typeSelect.value;
      const amount = parseInt(amountInput.value, 10);
      if ((type === 'raise' || type === 'allin') && amount > 0) {
        onSubmit({ type, amount });
      }
    }
  });

  // Confirm button for amount-based actions
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'action-confirm-btn';
  confirmBtn.textContent = '确认';
  confirmBtn.style.display = 'none';
  confirmBtn.addEventListener('click', () => {
    const type = typeSelect.value;
    const amount = parseInt(amountInput.value, 10);
    if ((type === 'raise' || type === 'allin') && amount > 0) {
      onSubmit({ type, amount });
    }
  });

  // Show confirm button when amount is needed
  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    confirmBtn.style.display = (type === 'raise' || type === 'allin') ? 'inline-block' : 'none';
  });

  row.appendChild(typeSelect);
  row.appendChild(amountInput);
  row.appendChild(confirmBtn);

  return row;
}

/**
 * Lock an action row after submission (prevent further editing).
 * @param {HTMLDivElement} row
 */
function lockRow(row) {
  row.classList.add('action-locked');
  const select = row.querySelector('.action-type');
  const input = row.querySelector('.action-amount');
  const btn = row.querySelector('.action-confirm-btn');
  if (select) select.disabled = true;
  if (input) input.disabled = true;
  if (btn) btn.style.display = 'none';
}
