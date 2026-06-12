/**
 * Community Cards Screen - lets the user select flop/turn/river board cards.
 * Uses createCardGrid from card-selector.js for the visual grid.
 */
import { cardToString } from '../../engine/card.js';
import { createCardGrid } from '../card-selector.js';

const STAGE_LABELS = {
  preflop: '翻牌',
  flop: '转牌',
  turn: '河牌',
};

/**
 * Create the community cards selection screen.
 * @param {import('../game-tracker.js').GameState} gameState
 * @param {number} numCards - number of cards to select (3 for flop, 1 for turn/river)
 * @param {(newCards: Array<{ rank: string, suit: string, value: number }>) => void} onComplete
 * @returns {HTMLElement}
 */
export function createCommunityCardsScreen(gameState, numCards, onComplete) {
  const stageLabel = STAGE_LABELS[gameState.stage] || gameState.stage;

  const screen = document.createElement('div');
  screen.className = 'screen community-cards-screen';

  // -- header
  const header = document.createElement('h2');
  header.className = 'screen-header';
  header.textContent = '选择' + stageLabel + '牌 (' + numCards + '张)';
  screen.appendChild(header);

  // -- hint
  const hint = document.createElement('div');
  hint.className = 'selected-info';
  hint.textContent = '点击选牌，再次点击取消选择';
  screen.appendChild(hint);

  // -- existing board cards display -----------------------------------------
  if (gameState.boardCards && gameState.boardCards.length > 0) {
    const existingDisplay = document.createElement('div');
    existingDisplay.className = 'board-display';
    existingDisplay.textContent = '已有公共牌: ' + gameState.boardCards.map(cardToString).join(' ');
    existingDisplay.style.marginBottom = '8px';
    screen.appendChild(existingDisplay);
  }

  // -- state ---------------------------------------------------------------
  const selectedCards = [];
  // Combine hole cards + existing board cards as "used" (disabled in grid)
  const usedCards = [
    ...(gameState.holeCards || []),
    ...(gameState.boardCards || []),
  ];

  // -- card grid -----------------------------------------------------------
  const grid = createCardGrid(
    handleSelect,
    usedCards,
    gameState.isShortDeck,
  );
  screen.appendChild(grid);

  // -- selected cards info --------------------------------------------------
  const infoLine = document.createElement('div');
  infoLine.className = 'selected-info';
  infoLine.textContent = '已选: 0/' + numCards;
  screen.appendChild(infoLine);

  // -- confirm button -------------------------------------------------------
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'primary-btn';
  confirmBtn.textContent = '确认';
  confirmBtn.disabled = true;
  confirmBtn.addEventListener('click', () => {
    if (selectedCards.length === numCards) {
      // Pass only the new cards (not existing board cards)
      onComplete([...selectedCards]);
    }
  });
  screen.appendChild(confirmBtn);

  // -- handlers ------------------------------------------------------------

  function handleSelect(card) {
    const idx = findCardIndex(selectedCards, card);
    if (idx !== -1) {
      selectedCards.splice(idx, 1);
    } else if (selectedCards.length < numCards) {
      selectedCards.push(card);
    } else {
      return false; // reject - already full
    }
    updateUI();
    return true;
  }

  function updateUI() {
    const count = selectedCards.length;
    const names = selectedCards.map(cardToString).join(' ');
    infoLine.textContent = count > 0
      ? '已选: ' + count + '/' + numCards + ' \u2014 ' + names
      : '已选: 0/' + numCards;

    confirmBtn.disabled = count !== numCards;
  }

  return screen;
}

/**
 * Find a card in the list by rank+suit identity.
 * @param {Array} list
 * @param {{ rank: string, suit: string }} card
 * @returns {number} index or -1
 */
function findCardIndex(list, card) {
  return list.findIndex(
    (c) => c.rank === card.rank && c.suit === card.suit,
  );
}
