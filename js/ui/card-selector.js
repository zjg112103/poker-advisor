/**
 * Card Selector UI Component.
 * Creates a grid of card buttons for selecting cards in a poker game.
 */

import { RANKS, SHORT_RANKS, SUITS, SUIT_SYMBOLS, RANK_VALUES, cardToId } from '../engine/card.js';

const RED_SUITS = new Set(['hearts', 'diamonds']);

/**
 * Create a card grid for card selection.
 * @param {function({rank: string, suit: string, value: number}): void} onCardSelect - Callback when a card is clicked
 * @param {Array<{rank: string, suit: string}>} selectedCards - Already selected cards (will be disabled)
 * @param {boolean} isShortDeck - Whether to use short deck (36 cards, 6-A)
 * @returns {HTMLDivElement} The card grid container element
 */
export function createCardGrid(onCardSelect, selectedCards = [], isShortDeck = false) {
  const container = document.createElement('div');
  container.className = 'card-grid' + (isShortDeck ? ' short-deck' : '');

  const ranks = isShortDeck ? SHORT_RANKS : RANKS;
  const selectedIds = new Set(selectedCards.map(cardToId));

  for (const suit of SUITS) {
    for (const rank of ranks) {
      const btn = document.createElement('button');
      btn.className = 'card-btn';

      const isRed = RED_SUITS.has(suit);
      btn.classList.add(isRed ? 'card-red' : 'card-black');

      btn.textContent = `${rank}${SUIT_SYMBOLS[suit]}`;
      btn.dataset.rank = rank;
      btn.dataset.suit = suit;

      const cardId = cardToId({ rank, suit });
      if (selectedIds.has(cardId)) {
        btn.disabled = true;
        btn.classList.add('card-selected');
      }

      btn.addEventListener('click', () => {
        onCardSelect({ rank, suit, value: RANK_VALUES[rank] });
      });

      container.appendChild(btn);
    }
  }

  return container;
}
