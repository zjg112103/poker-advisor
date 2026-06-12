/**
 * History Screen - shows past hand results stored in localStorage.
 * Reuses the HandHistory class for consistent data access.
 */

import { HandHistory } from '../../storage/history.js';

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

/**
 * Create the history screen element.
 * @param {() => void} onBack - go back to main screen
 * @returns {HTMLDivElement}
 */
export function createHistoryScreen(onBack) {
  const screen = document.createElement('div');
  screen.className = 'screen history-screen';

  // -- header ---------------------------------------------------------------
  const header = document.createElement('h2');
  header.className = 'screen-header';
  header.textContent = '历史记录';
  screen.appendChild(header);

  // -- load history via HandHistory ----------------------------------------
  const history = new HandHistory();
  const hands = history.getAll();

  if (hands.length === 0) {
    // Empty state
    const emptyEl = document.createElement('div');
    emptyEl.className = 'history-empty';
    emptyEl.textContent = '暂无历史记录';
    emptyEl.style.textAlign = 'center';
    emptyEl.style.color = '#64748b';
    emptyEl.style.padding = '40px 0';
    screen.appendChild(emptyEl);
  } else {
    // History list
    const list = document.createElement('div');
    list.className = 'history-list';

    hands.forEach((entry) => {
      const item = createHistoryItem(entry);
      list.appendChild(item);
    });

    screen.appendChild(list);
  }

  // -- back button ----------------------------------------------------------
  const backBtn = document.createElement('button');
  backBtn.className = 'secondary-btn';
  backBtn.style.marginTop = '16px';
  backBtn.textContent = '返回';
  backBtn.addEventListener('click', onBack);
  screen.appendChild(backBtn);

  return screen;
}

/**
 * Create a single history list item.
 * @param {Object} entry - a history entry
 * @returns {HTMLDivElement}
 */
function createHistoryItem(entry) {
  const item = document.createElement('div');
  item.className = 'history-item';
  item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #334155;border-radius:8px;background:#1e293b;';

  // Left: action + equity
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:8px;';

  const actionKey = (entry.action || '').toUpperCase();
  const color = ACTION_COLORS[actionKey] || '#64748b';
  const label = ACTION_LABELS[actionKey] || entry.action || '-';

  const actionEl = document.createElement('span');
  actionEl.style.cssText = 'font-weight:bold;color:' + color + ';';
  actionEl.textContent = label;
  left.appendChild(actionEl);

  if (entry.equity !== undefined) {
    const equityEl = document.createElement('span');
    equityEl.style.cssText = 'color:#94a3b8;font-size:0.9rem;';
    equityEl.textContent = (entry.equity * 100).toFixed(1) + '%';
    left.appendChild(equityEl);
  }

  item.appendChild(left);

  // Right: short deck flag + timestamp
  const right = document.createElement('div');
  right.style.cssText = 'display:flex;align-items:center;gap:8px;';

  if (entry.isShortDeck) {
    const badge = document.createElement('span');
    badge.style.cssText = 'font-size:0.75rem;background:#334155;padding:2px 6px;border-radius:4px;color:#94a3b8;';
    badge.textContent = '短牌';
    right.appendChild(badge);
  }

  if (entry.timestamp) {
    const timeEl = document.createElement('span');
    timeEl.style.cssText = 'color:#64748b;font-size:0.8rem;';
    timeEl.textContent = formatTime(entry.timestamp);
    right.appendChild(timeEl);
  }

  item.appendChild(right);

  return item;
}

/**
 * Format a timestamp to a readable string.
 * @param {number|string} ts
 * @returns {string}
 */
function formatTime(ts) {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return month + '/' + day + ' ' + hour + ':' + min;
  } catch {
    return '';
  }
}
