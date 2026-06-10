/**
 * Hole Cards Screen - lets the user select exactly two hole cards.
 * Uses createCardGrid from card-selector.js for the visual grid.
 */
import { cardToString, SUIT_SYMBOLS, RANK_VALUES } from '../../engine/card.js';
import { createCardGrid } from '../card-selector.js';

/**
 * Create the hole-cards selection screen.
 * @param {{ isShortDeck: boolean }} gameState - current game state (uses isShortDeck)
 * @param {(selectedCards: Array<{ rank: string, suit: string }>) => void} onComplete
 * @returns {HTMLElement}
 */
export function createHoleCardsScreen(gameState, onComplete) {
  const screen = document.createElement('div');
  screen.className = 'screen hole-cards-screen';

  // -- header --------------------------------------------------------------
  const header = document.createElement('h2');
  header.className = 'screen-header';
  header.textContent = '选择你的底牌';
  screen.appendChild(header);

  // -- state ---------------------------------------------------------------
  const selectedCards = [];

  // -- card grid -----------------------------------------------------------
  const grid = createCardGrid({
    isShortDeck: gameState.isShortDeck,
    onSelect: handleSelect,
    maxSelect: 2,
  });
  screen.appendChild(grid);

  // -- selected cards display ----------------------------------------------
  const infoLine = document.createElement('div');
  infoLine.className = 'selected-info';
  infoLine.textContent = '已选: 0/2';
  screen.appendChild(infoLine);

  // -- confirm button ------------------------------------------------------
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'primary-btn';
  confirmBtn.textContent = '确认';
  confirmBtn.disabled = true;
  confirmBtn.addEventListener('click', () => {
    if (selectedCards.length === 2) {
      onComplete([...selectedCards]);
    }
  });
  screen.appendChild(confirmBtn);

  // -- handlers ------------------------------------------------------------

  function handleSelect(card) {
    const idx = findCardIndex(selectedCards, card);
    if (idx !== -1) {
      // deselect
      selectedCards.splice(idx, 1);
    } else if (selectedCards.length < 2) {
      selectedCards.push(card);
    } else {
      // already have 2 cards, ignore
      return;
    }
    updateUI();
  }

  function updateUI() {
    const count = selectedCards.length;
    const names = selectedCards.map(cardToString).join(' ');
    infoLine.textContent = count > 0
      ? `已选: ${count}/2 \u2014 ${names}`
      : '已选: 0/2';

    confirmBtn.disabled = count !== 2;

    // Tell the grid which cards are currently selected so it can
    // highlight / disable them visually.
    if (typeof grid.setSelected === 'function') {
      grid.setSelected(selectedCards);
    }
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
