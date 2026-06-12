/**
 * Result Screen - displays the advisor's recommendation with equity data.
 * Shows action, equity %, hand type, reason, pot odds, confidence, and navigation.
 */
import './result-screen.css';

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

/**
 * Create the result screen element.
 * @param {import('../game-tracker.js').GameState} gameState
 * @param {{ action: string, amount?: number, reason: string, confidence: string }} recommendation
 * @param {{ equity: number, handType: string, potOdds?: number }} equityData
 * @param {() => void} onContinue - advance to next street (flop/turn/river community cards)
 * @param {() => void} onNewHand - start a new hand
 * @returns {HTMLDivElement}
 */
export function createResultScreen(gameState, recommendation, equityData, onContinue, onNewHand) {
  const screen = document.createElement('div');
  screen.className = 'screen result-screen';

  const actionKey = (recommendation.action || '').toUpperCase();
  const borderColor = ACTION_COLORS[actionKey] || '#64748b';
  const actionLabel = ACTION_LABELS[actionKey] || recommendation.action;

  // -- result card ----------------------------------------------------------
  const card = document.createElement('div');
  card.className = 'result-card';
  card.style.borderColor = borderColor;

  // Action text (very large)
  const actionText = document.createElement('div');
  actionText.className = 'result-action';
  actionText.style.color = borderColor;

  const amount = recommendation.raiseAmount || recommendation.betAmount || recommendation.amount;
  const hasAmount = (actionKey === 'RAISE' || actionKey === 'BET') && amount;
  actionText.textContent = hasAmount
    ? actionLabel + ' ' + amount
    : actionLabel;
  card.appendChild(actionText);

  // Equity percentage
  const equityEl = document.createElement('div');
  equityEl.className = 'result-equity';
  equityEl.textContent = '胜率: ' + formatPercent(equityData.equity);
  card.appendChild(equityEl);

  // Hand type name
  if (equityData.handType) {
    const handTypeEl = document.createElement('div');
    handTypeEl.className = 'result-hand-type';
    handTypeEl.textContent = equityData.handType;
    card.appendChild(handTypeEl);
  }

  screen.appendChild(card);

  // -- reason ---------------------------------------------------------------
  if (recommendation.reason) {
    const reasonEl = document.createElement('div');
    reasonEl.className = 'result-reason';
    reasonEl.textContent = recommendation.reason;
    screen.appendChild(reasonEl);
  }

  // -- pot odds -------------------------------------------------------------
  if (equityData.potOdds !== undefined && equityData.potOdds !== null) {
    const potOddsEl = document.createElement('div');
    potOddsEl.className = 'result-pot-odds';
    potOddsEl.textContent = '底池赔率: ' + formatPercent(equityData.potOdds);
    screen.appendChild(potOddsEl);
  }

  // -- confidence level -----------------------------------------------------
  const confidence = recommendation.confidence || 'medium';
  const confidenceEl = document.createElement('div');
  confidenceEl.className = 'result-confidence confidence-' + confidence;
  confidenceEl.textContent = '信心等级: ' + (CONFIDENCE_LABELS[confidence] || confidence);
  screen.appendChild(confidenceEl);

  // -- buttons --------------------------------------------------------------
  const buttonsRow = document.createElement('div');
  buttonsRow.className = 'result-buttons';

  // "下一轮" button - only if not at river stage
  const isRiver = gameState.stage === 'river';
  if (!isRiver) {
    const continueBtn = document.createElement('button');
    continueBtn.className = 'primary-btn';
    continueBtn.style.flex = '1';
    continueBtn.textContent = '下一轮';
    continueBtn.addEventListener('click', onContinue);
    buttonsRow.appendChild(continueBtn);
  }

  // "新一手牌" button
  const newHandBtn = document.createElement('button');
  newHandBtn.className = 'secondary-btn';
  newHandBtn.textContent = '新一手牌';
  newHandBtn.addEventListener('click', onNewHand);
  buttonsRow.appendChild(newHandBtn);

  screen.appendChild(buttonsRow);

  return screen;
}

/**
 * Format a decimal (0-1) as a percentage string.
 * @param {number} value
 * @returns {string}
 */
function formatPercent(value) {
  if (typeof value !== 'number' || isNaN(value)) return '-';
  return (value * 100).toFixed(1) + '%';
}
