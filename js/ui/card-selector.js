/**
 * Card Selector UI Component.
 * Creates a grid of card buttons for selecting cards in a poker game.
 */

import { RANKS, SHORT_RANKS, SUITS, SUIT_SYMBOLS, RANK_VALUES, cardToId } from '../engine/card.js';

const RED_SUITS = new Set(['hearts', 'diamonds']);

/**
 * Create a card grid for card selection.
 * @param {function({rank: string, suit: string, value: number}): boolean} onCardSelect - Callback when a card is clicked. Return false to reject the selection (visual state will revert).
 * @param {Array<{rank: string, suit: string}>} disabledCards - Cards that are already used (will be disabled)
 * @param {boolean} isShortDeck - Whether to use short deck (36 cards, 6-A)
 * @returns {HTMLDivElement} The card grid container element
 */
export function createCardGrid(onCardSelect, disabledCards = [], isShortDeck = false) {
  const container = document.createElement('div');
  container.className = 'card-grid' + (isShortDeck ? ' short-deck' : '');

  const ranks = isShortDeck ? SHORT_RANKS : RANKS;
  const disabledIds = new Set(disabledCards.map(cardToId));

  for (const suit of SUITS) {
    for (const rank of ranks) {
      const btn = document.createElement('button');
      btn.className = 'card-btn';

      const isRed = RED_SUITS.has(suit);
      btn.classList.add(isRed ? 'card-red' : 'card-black');

      btn.textContent = rank + SUIT_SYMBOLS[suit];
      btn.dataset.rank = rank;
      btn.dataset.suit = suit;

      const cardId = cardToId({ rank, suit });

      if (disabledIds.has(cardId)) {
        btn.disabled = true;
        btn.classList.add('card-selected');
      }

      btn.addEventListener('click', () => {
        if (btn.disabled || disabledIds.has(cardId)) return;

        // Optimistically toggle visual state
        const wasSelected = btn.classList.contains('card-selected');
        if (wasSelected) {
          btn.classList.remove('card-selected');
        } else {
          btn.classList.add('card-selected');
        }

        // Notify caller; if rejected, revert visual state
        const accepted = onCardSelect({ rank, suit, value: RANK_VALUES[rank] });
        if (accepted === false) {
          // Revert
          if (wasSelected) {
            btn.classList.add('card-selected');
          } else {
            btn.classList.remove('card-selected');
          }
        }
      });

      container.appendChild(btn);
    }
  }

  return container;
}
