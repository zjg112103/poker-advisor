# Texas Hold'em Poker Advisor - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first web app that provides real-time poker strategy advice (fold/call/raise) using Monte Carlo simulation, supporting both standard 52-card and short deck 36-card games.

**Architecture:** Pure vanilla HTML/CSS/JS SPA with no framework. All computation runs client-side in the browser. Monte Carlo engine evaluates hand equity against random opponent hands, compares with pot odds, and outputs a recommendation. Hand history persisted in LocalStorage. Deployed as a PWA for offline use.

**Tech Stack:** Vite (dev server + build), Vitest (testing), Vanilla JS (ES modules), CSS (mobile-first), LocalStorage (persistence), PWA (Service Worker + Manifest).

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `js/main.js` (entry point, empty placeholder)
- Create: `css/styles.css` (minimal reset)

**Step 1: Initialize project**

Run:
```bash
cd /d/zjg/poker-advisor
npm init -y
npm install -D vite vitest
```

**Step 2: Configure vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  test: {
    // vitest config
  },
});
```

**Step 3: Create minimal index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Poker Advisor</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/js/main.js"></script>
</body>
</html>
```

**Step 4: Add npm scripts to package.json**

Add to scripts:
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server starts, page loads at localhost

**Step 6: Commit**

```bash
git init
git add package.json vite.config.js index.html js/main.js css/styles.css
git commit -m "chore: scaffold project with vite + vitest"
```

---

## Task 2: Card Types and Deck Module

**Files:**
- Create: `js/engine/card.js`
- Create: `tests/engine/card.test.js`

**Step 1: Write the failing test**

```js
// tests/engine/card.test.js
import { describe, it, expect } from 'vitest';
import {
  createCard, cardToString, cardToId,
  createStandardDeck, createShortDeck,
  shuffleDeck, removeCards
} from '../../js/engine/card.js';

describe('Card', () => {
  it('creates a card with suit and rank', () => {
    const card = createCard('A', 'spades');
    expect(card.rank).toBe('A');
    expect(card.suit).toBe('spades');
  });

  it('converts card to string', () => {
    expect(cardToString(createCard('A', 'spades'))).toBe('A\u2660');
    expect(cardToString(createCard('K', 'hearts'))).toBe('K\u2665');
  });

  it('creates standard 52-card deck', () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);
  });

  it('creates short 36-card deck (no 2-5)', () => {
    const deck = createShortDeck();
    expect(deck).toHaveLength(36);
    const ranks = deck.map(c => c.rank);
    expect(ranks).not.toContain('2');
    expect(ranks).not.toContain('3');
    expect(ranks).not.toContain('4');
    expect(ranks).not.toContain('5');
  });

  it('shuffles deck and produces different order', () => {
    const deck = createStandardDeck();
    const original = deck.map(c => cardToId(c));
    shuffleDeck(deck, 12345);
    const shuffled = deck.map(c => cardToId(c));
    expect(shuffled).not.toEqual(original);
    // but same cards
    expect(shuffled.sort()).toEqual(original.sort());
  });

  it('removes specified cards from deck', () => {
    const deck = createStandardDeck();
    const toRemove = [createCard('A', 'spades'), createCard('K', 'hearts')];
    const result = removeCards(deck, toRemove);
    expect(result).toHaveLength(50);
    expect(result.find(c => c.rank === 'A' && c.suit === 'spades')).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/card.test.js`
Expected: FAIL - module not found

**Step 3: Implement card.js**

```js
// js/engine/card.js
export const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
export const SHORT_RANKS = ['6','7','8','9','T','J','Q','K','A'];
export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const SUIT_SYMBOLS = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
export const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };

export function createCard(rank, suit) {
  return { rank, suit, value: RANK_VALUES[rank] };
}

export function cardToString(card) {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function cardToId(card) {
  return `${card.rank}_${card.suit}`;
}

export function createStandardDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

export function createShortDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of SHORT_RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

// Simple seeded PRNG (xorshift32) for reproducible shuffles
export function shuffleDeck(deck, seed = Date.now()) {
  let s = seed | 0;
  function next() {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function removeCards(deck, cards) {
  const ids = new Set(cards.map(cardToId));
  return deck.filter(c => !ids.has(cardToId(c)));
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine/card.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add js/engine/card.js tests/engine/card.test.js
git commit -m "feat: add card types and deck module"
```

---

## Task 3: Hand Evaluator (Standard 52-card)

**Files:**
- Create: `js/engine/hand-evaluator.js`
- Create: `tests/engine/hand-evaluator.test.js`

**Step 1: Write the failing test**

```js
// tests/engine/hand-evaluator.test.js
import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, getHandName } from '../../js/engine/hand-evaluator.js';
import { createCard } from '../../js/engine/card.js';

const c = (rank, suit) => createCard(rank, suit);

describe('HandEvaluator', () => {
  it('identifies royal flush', () => {
    const hand = [c('A','spades'), c('K','spades'), c('Q','spades'), c('J','spades'), c('T','spades'), c('2','hearts'), c('3','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(9); // Royal flush
    expect(getHandName(result)).toBe('皇家同花顺');
  });

  it('identifies straight flush', () => {
    const hand = [c('9','spades'), c('K','spades'), c('Q','spades'), c('J','spades'), c('T','spades'), c('2','hearts'), c('3','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(8);
    expect(getHandName(result)).toBe('同花顺');
  });

  it('identifies four of a kind', () => {
    const hand = [c('A','spades'), c('A','hearts'), c('A','diamonds'), c('A','clubs'), c('K','spades'), c('2','hearts'), c('3','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(7);
  });

  it('identifies full house', () => {
    const hand = [c('K','spades'), c('K','hearts'), c('K','diamonds'), c('A','clubs'), c('A','spades'), c('2','hearts'), c('3','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(6);
  });

  it('identifies flush', () => {
    const hand = [c('A','spades'), c('K','spades'), c('Q','spades'), c('J','spades'), c('3','spades'), c('2','hearts'), c('4','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(5);
  });

  it('identifies straight', () => {
    const hand = [c('5','spades'), c('6','hearts'), c('7','diamonds'), c('8','clubs'), c('9','spades'), c('2','hearts'), c('K','diamonds')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(4);
  });

  it('identifies three of a kind', () => {
    const hand = [c('A','spades'), c('A','hearts'), c('A','diamonds'), c('K','clubs'), c('Q','spades'), c('2','hearts'), c('3','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(3);
  });

  it('identifies two pair', () => {
    const hand = [c('A','spades'), c('A','hearts'), c('K','diamonds'), c('K','clubs'), c('Q','spades'), c('2','hearts'), c('3','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(2);
  });

  it('identifies one pair', () => {
    const hand = [c('A','spades'), c('A','hearts'), c('K','diamonds'), c('Q','clubs'), c('J','spades'), c('2','hearts'), c('3','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(1);
  });

  it('identifies high card', () => {
    const hand = [c('A','spades'), c('K','hearts'), c('Q','diamonds'), c('J','clubs'), c('9','spades'), c('2','hearts'), c('3','hearts')];
    const result = evaluateHand(hand);
    expect(result.rank).toBe(0);
  });

  it('compares two hands correctly', () => {
    const flush = evaluateHand([c('A','spades'), c('K','spades'), c('Q','spades'), c('J','spades'), c('3','spades'), c('2','hearts'), c('4','hearts')]);
    const fullHouse = evaluateHand([c('K','spades'), c('K','hearts'), c('K','diamonds'), c('A','clubs'), c('A','spades'), c('2','hearts'), c('3','hearts')]);
    // Standard: full house (6) > flush (5)
    expect(compareHands(fullHouse, flush)).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/hand-evaluator.test.js`
Expected: FAIL

**Step 3: Implement hand-evaluator.js**

The evaluator takes 7 cards and finds the best 5-card hand. For speed, it uses direct evaluation instead of enumerating all C(7,5)=21 combinations for simple cases, but enumerates for completeness.

```js
// js/engine/hand-evaluator.js
import { RANK_VALUES } from './card.js';

// Hand rankings (standard): high card=0, pair=1, two pair=2, trips=3, straight=4, flush=5, full house=6, quads=7, straight flush=8, royal flush=9
export const HAND_NAMES_STANDARD = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺', '皇家同花顺'];
export const HAND_NAMES_SHORT = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺', '皇家同花顺'];

export function evaluateHand(cards, options = {}) {
  // cards: 5-7 cards, find best 5-card hand
  const isShortDeck = options.shortDeck || false;

  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  if (cards.length === 5) {
    return evaluate5(cards, isShortDeck);
  }

  // Enumerate all C(n,5) combinations and find the best
  let best = null;
  const combos = combinations(cards, 5);
  for (const combo of combos) {
    const result = evaluate5(combo, isShortDeck);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }
  return best;
}

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards, isShortDeck) {
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(values, isShortDeck);

  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const countValues = Object.entries(counts)
    .map(([v, c]) => ({ value: parseInt(v), count: c }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  let rank, kickers;

  if (isFlush && isStraight) {
    const high = getStraightHigh(values, isShortDeck);
    if (high === 14) { rank = 9; } // Royal flush
    else { rank = 8; } // Straight flush
    kickers = [high];
  } else if (countValues[0].count === 4) {
    rank = 7; // Four of a kind
    kickers = [countValues[0].value, countValues[1].value];
  } else if (isShortDeck) {
    // Short deck: flush(5) > full house(6)
    if (isFlush) {
      rank = 6; // Flush is ranked higher in short deck
      kickers = values;
    } else if (countValues[0].count === 3 && countValues[1].count === 2) {
      rank = 5; // Full house
      kickers = [countValues[0].value, countValues[1].value];
    } else if (isStraight) {
      rank = 4;
      kickers = [getStraightHigh(values, isShortDeck)];
    } else if (countValues[0].count === 3) {
      rank = 3;
      kickers = countValues.map(cv => cv.value);
    } else {
      rank = getPairRank(countValues);
      kickers = countValues.map(cv => cv.value);
    }
  } else {
    // Standard: full house(6) > flush(5)
    if (countValues[0].count === 3 && countValues[1].count === 2) {
      rank = 6; // Full house
      kickers = [countValues[0].value, countValues[1].value];
    } else if (isFlush) {
      rank = 5;
      kickers = values;
    } else if (isStraight) {
      rank = 4;
      kickers = [getStraightHigh(values, false)];
    } else if (countValues[0].count === 3) {
      rank = 3;
      kickers = countValues.map(cv => cv.value);
    } else {
      rank = getPairRank(countValues);
      kickers = countValues.map(cv => cv.value);
    }
  }

  return { rank, kickers, cards: [...cards] };
}

function getPairRank(countValues) {
  const counts = countValues.map(cv => cv.count);
  if (counts[0] === 2 && counts[1] === 2) return 2; // Two pair
  if (counts[0] === 2) return 1; // One pair
  return 0; // High card
}

function checkStraight(values, isShortDeck) {
  // values sorted desc
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.length < 5) return false;

  // Check 5 consecutive
  if (unique[0] - unique[4] === 4 && unique.length === 5) return true;

  // Check wheel (A-2-3-4-5) for standard, A-6-7-8-9 for short deck
  if (isShortDeck) {
    // A-6-7-8-9
    if (unique.includes(14) && unique.includes(9) && unique.includes(8) && unique.includes(7) && unique.includes(6)) {
      return true;
    }
  } else {
    // A-2-3-4-5
    if (unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
      return true;
    }
  }
  return false;
}

function getStraightHigh(values, isShortDeck) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique[0] - unique[4] === 4) return unique[0];

  if (isShortDeck) {
    // A-6-7-8-9 -> high is 9
    return 9;
  } else {
    // A-2-3-4-5 -> high is 5
    return 5;
  }
}

export function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
    if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
  }
  return 0;
}

export function getHandName(result, isShortDeck = false) {
  const names = isShortDeck ? HAND_NAMES_SHORT : HAND_NAMES_STANDARD;
  return names[result.rank] || '未知';
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine/hand-evaluator.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add js/engine/hand-evaluator.js tests/engine/hand-evaluator.test.js
git commit -m "feat: add hand evaluator with standard + short deck support"
```

---

## Task 4: Hand Evaluator - Short Deck Specific Tests

**Files:**
- Modify: `tests/engine/hand-evaluator.test.js` (append short deck tests)
- Create: `tests/engine/hand-evaluator-short.test.js`

**Step 1: Write short deck specific tests**

```js
// tests/engine/hand-evaluator-short.test.js
import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands } from '../../js/engine/hand-evaluator.js';
import { createCard } from '../../js/engine/card.js';

const c = (rank, suit) => createCard(rank, suit);
const SD = { shortDeck: true };

describe('HandEvaluator Short Deck', () => {
  it('flush beats full house in short deck', () => {
    const flush = evaluateHand([c('A','spades'), c('K','spades'), c('Q','spades'), c('J','spades'), c('9','spades'), c('8','hearts'), c('7','hearts')], SD);
    const fullHouse = evaluateHand([c('K','spades'), c('K','hearts'), c('K','diamonds'), c('A','clubs'), c('A','spades'), c('8','hearts'), c('7','hearts')], SD);
    // Short deck: flush rank(6) > full house rank(5)
    expect(flush.rank).toBeGreaterThan(fullHouse.rank);
    expect(compareHands(flush, fullHouse)).toBeGreaterThan(0);
  });

  it('A-6-7-8-9 is a valid straight in short deck', () => {
    const hand = [c('A','spades'), c('6','hearts'), c('7','diamonds'), c('8','clubs'), c('9','spades'), c('T','hearts'), c('J','hearts')];
    const result = evaluateHand(hand, SD);
    expect(result.rank).toBe(4); // straight
  });

  it('standard deck: full house beats flush', () => {
    const flush = evaluateHand([c('A','spades'), c('K','spades'), c('Q','spades'), c('J','spades'), c('3','spades'), c('2','hearts'), c('4','hearts')]);
    const fullHouse = evaluateHand([c('K','spades'), c('K','hearts'), c('K','diamonds'), c('A','clubs'), c('A','spades'), c('2','hearts'), c('3','hearts')]);
    expect(fullHouse.rank).toBeGreaterThan(flush.rank);
  });
});
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add tests/engine/hand-evaluator-short.test.js
git commit -m "test: add short deck specific hand evaluation tests"
```

---

## Task 5: Monte Carlo Simulation Engine

**Files:**
- Create: `js/engine/monte-carlo.js`
- Create: `tests/engine/monte-carlo.test.js`

**Step 1: Write the failing test**

```js
// tests/engine/monte-carlo.test.js
import { describe, it, expect } from 'vitest';
import { calculateEquity } from '../../js/engine/monte-carlo.js';
import { createCard } from '../../js/engine/card.js';

const c = (rank, suit) => createCard(rank, suit);

describe('MonteCarlo', () => {
  it('AA vs KK has ~80% equity (standard)', () => {
    const holeCards = [[c('A','spades'), c('A','hearts')]];
    const opponents = [[c('K','diamonds'), c('K','clubs')]];
    const result = calculateEquity(holeCards, opponents, [], { iterations: 10000 });
    expect(result.equities[0]).toBeGreaterThan(0.75);
    expect(result.equities[0]).toBeLessThan(0.87);
  });

  it('AA vs KK has ~77% equity (short deck)', () => {
    const holeCards = [[c('A','spades'), c('A','hearts')]];
    const opponents = [[c('K','diamonds'), c('K','clubs')]];
    const result = calculateEquity(holeCards, opponents, [], { iterations: 10000, shortDeck: true });
    expect(result.equities[0]).toBeGreaterThan(0.70);
    expect(result.equities[0]).toBeLessThan(0.82);
  });

  it('equity changes after flop', () => {
    const holeCards = [[c('A','spades'), c('K','spades')]];
    const opponents = [[c('Q','diamonds'), c('J','clubs')]];
    const board = [c('T','spades'), c('9','spades'), c('2','hearts')];
    const result = calculateEquity(holeCards, opponents, board, { iterations: 5000 });
    // AK should have good equity with straight + flush draws
    expect(result.equities[0]).toBeGreaterThan(0.5);
  });

  it('handles multiple opponents', () => {
    const holeCards = [[c('A','spades'), c('A','hearts')]];
    const opponents = [
      [c('K','diamonds'), c('Q','diamonds')],
      [c('J','clubs'), c('T','clubs')],
    ];
    const result = calculateEquity(holeCards, opponents, [], { iterations: 5000 });
    // AA vs 2 opponents still favored but less than vs 1
    expect(result.equities[0]).toBeGreaterThan(0.5);
    expect(result.equities[0]).toBeLessThan(0.85);
  });

  it('handles unknown opponents (random)', () => {
    const holeCards = [[c('A','spades'), c('K','hearts')]];
    const result = calculateEquity(holeCards, [], [], { iterations: 5000, numRandomOpponents: 1 });
    // AK should be >50% vs random hand
    expect(result.equities[0]).toBeGreaterThan(0.55);
  });

  it('runs within reasonable time', () => {
    const start = Date.now();
    const holeCards = [[c('A','spades'), c('K','hearts')]];
    calculateEquity(holeCards, [], [], { iterations: 10000, numRandomOpponents: 3 });
    const elapsed = Date.now() - start;
    // Should complete 10K iterations with 3 opponents in under 3 seconds
    expect(elapsed).toBeLessThan(3000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/monte-carlo.test.js`
Expected: FAIL

**Step 3: Implement monte-carlo.js**

```js
// js/engine/monte-carlo.js
import { createStandardDeck, createShortDeck, shuffleDeck, removeCards } from './card.js';
import { evaluateHand, compareHands } from './hand-evaluator.js';

/**
 * Calculate equity using Monte Carlo simulation.
 * @param {Array} holeCards - Array of player hands: [[card, card], ...]
 * @param {Array} knownOpponents - Array of known opponent hands: [[card, card], ...]
 * @param {Array} board - Known community cards
 * @param {Object} options - { iterations, shortDeck, numRandomOpponents }
 * @returns {{ equities: number[], handTypes: string[][] }}
 */
export function calculateEquity(holeCards, knownOpponents, board, options = {}) {
  const {
    iterations = 5000,
    shortDeck = false,
    numRandomOpponents = 0,
  } = options;

  const allPlayers = [...holeCards, ...knownOpponents];
  const numPlayers = allPlayers.length + numRandomOpponents;
  const wins = new Array(numPlayers).fill(0);
  const ties = new Array(numPlayers).fill(0);
  const handTypeCounts = Array.from({ length: numPlayers }, () => ({}));

  const knownCards = [...allPlayers.flat(), ...board];
  const createDeck = shortDeck ? createShortDeck : createStandardDeck;

  for (let i = 0; i < iterations; i++) {
    const deck = removeCards(createDeck(), knownCards);
    shuffleDeck(deck, i * 7919 + 104729); // varied seed per iteration

    let cardIdx = 0;

    // Deal random opponent hands
    const simHands = allPlayers.map(h => [...h]);
    for (let r = 0; r < numRandomOpponents; r++) {
      simHands.push([deck[cardIdx++], deck[cardIdx++]]);
    }

    // Deal remaining board cards
    const simBoard = [...board];
    const remaining = 5 - board.length;
    for (let r = 0; r < remaining; r++) {
      simBoard.push(deck[cardIdx++]);
    }

    // Evaluate each player's best hand
    const evalOptions = { shortDeck };
    const evaluated = simHands.map(hand =>
      evaluateHand([...hand, ...simBoard], evalOptions)
    );

    // Track hand types
    for (let p = 0; p < numPlayers; p++) {
      const ht = evaluated[p].rank;
      handTypeCounts[p][ht] = (handTypeCounts[p][ht] || 0) + 1;
    }

    // Find winner(s)
    let bestIdx = 0;
    for (let p = 1; p < numPlayers; p++) {
      if (compareHands(evaluated[p], evaluated[bestIdx]) > 0) {
        bestIdx = p;
      }
    }

    // Check for ties
    const winners = [bestIdx];
    for (let p = 0; p < numPlayers; p++) {
      if (p !== bestIdx && compareHands(evaluated[p], evaluated[bestIdx]) === 0) {
        winners.push(p);
      }
    }

    if (winners.length > 1) {
      for (const w of winners) ties[w]++;
    } else {
      wins[bestIdx]++;
    }
  }

  const equities = [];
  for (let p = 0; p < numPlayers; p++) {
    equities.push((wins[p] + ties[p] / numPlayers) / iterations);
  }

  return { equities, handTypeCounts, iterations };
}

/**
 * Calculate pot odds percentage.
 * @param {number} potSize - Current pot size
 * @param {number} callAmount - Amount needed to call
 * @returns {number} Required equity percentage (0-100)
 */
export function calculatePotOdds(potSize, callAmount) {
  if (callAmount === 0) return 0;
  return (callAmount / (potSize + callAmount)) * 100;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine/monte-carlo.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add js/engine/monte-carlo.js tests/engine/monte-carlo.test.js
git commit -m "feat: add Monte Carlo simulation engine"
```

---

## Task 6: Strategy Engine

**Files:**
- Create: `js/engine/strategy.js`
- Create: `tests/engine/strategy.test.js`

**Step 1: Write the failing test**

```js
// tests/engine/strategy.test.js
import { describe, it, expect } from 'vitest';
import { getRecommendation } from '../../js/engine/strategy.js';

describe('Strategy', () => {
  it('recommends fold when equity is much lower than pot odds', () => {
    const result = getRecommendation({
      equity: 20,        // 20% equity
      potOdds: 33,       // need 33% to call
      potSize: 100,
      callAmount: 50,
      stage: 'flop',
      position: 'utg',
      isShortDeck: false,
    });
    expect(result.action).toBe('FOLD');
  });

  it('recommends call when equity is slightly above pot odds', () => {
    const result = getRecommendation({
      equity: 40,
      potOdds: 33,
      potSize: 100,
      callAmount: 50,
      stage: 'flop',
      position: 'btn',
      isShortDeck: false,
    });
    expect(result.action).toBe('CALL');
  });

  it('recommends raise when equity is much higher than pot odds', () => {
    const result = getRecommendation({
      equity: 75,
      potOdds: 33,
      potSize: 100,
      callAmount: 50,
      stage: 'flop',
      position: 'btn',
      isShortDeck: false,
    });
    expect(result.action).toBe('RAISE');
    expect(result.raiseAmount).toBeGreaterThan(0);
  });

  it('recommends raise with suggested amount', () => {
    const result = getRecommendation({
      equity: 80,
      potOdds: 25,
      potSize: 200,
      callAmount: 50,
      stage: 'turn',
      position: 'btn',
      isShortDeck: false,
    });
    expect(result.action).toBe('RAISE');
    expect(result.raiseAmount).toBeDefined();
  });

  it('handles free check (callAmount=0)', () => {
    const result = getRecommendation({
      equity: 30,
      potOdds: 0,
      potSize: 100,
      callAmount: 0,
      stage: 'flop',
      position: 'bb',
      isShortDeck: false,
    });
    // Free check, always check/call
    expect(result.action).toBe('CHECK');
  });

  it('provides confidence level', () => {
    const result = getRecommendation({
      equity: 75,
      potOdds: 33,
      potSize: 100,
      callAmount: 50,
      stage: 'flop',
      position: 'btn',
      isShortDeck: false,
    });
    expect(result.confidence).toBeDefined();
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.confidence);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/strategy.test.js`
Expected: FAIL

**Step 3: Implement strategy.js**

```js
// js/engine/strategy.js
import { calculatePotOdds } from './monte-carlo.js';

/**
 * Get strategy recommendation based on equity and game state.
 * @param {Object} state
 * @returns {{ action: string, raiseAmount?: number, confidence: string, reason: string }}
 */
export function getRecommendation({ equity, potOdds, potSize, callAmount, stage, position, isShortDeck, numPlayers }) {
  // Free check
  if (callAmount === 0) {
    if (equity > 60) {
      return {
        action: 'BET',
        betAmount: Math.round(potSize * 0.5),
        confidence: equity > 75 ? 'HIGH' : 'MEDIUM',
        reason: `胜率${equity.toFixed(1)}%，主动下注`,
      };
    }
    return {
      action: 'CHECK',
      confidence: 'HIGH',
      reason: '无需下注，过牌',
    };
  }

  const calculatedPotOdds = potOdds > 0 ? potOdds : calculatePotOdds(potSize, callAmount);
  const edge = equity - calculatedPotOdds;

  // Strong hand: equity much higher than pot odds
  if (equity > 65 && edge > 20) {
    const raiseMultiplier = Math.min(equity / 100, 1);
    const raiseAmount = Math.round((potSize + callAmount) * (0.5 + raiseMultiplier * 0.5));
    return {
      action: 'RAISE',
      raiseAmount: Math.max(raiseAmount, callAmount * 2),
      confidence: 'HIGH',
      reason: `胜率${equity.toFixed(1)}% 远高于所需${calculatedPotOdds.toFixed(1)}%，强牌加注`,
    };
  }

  // Good enough to call
  if (edge > 0) {
    // Moderate edge
    if (edge > 10) {
      return {
        action: 'CALL',
        confidence: 'HIGH',
        reason: `胜率${equity.toFixed(1)}% > 所需${calculatedPotOdds.toFixed(1)}%，值得跟注`,
      };
    }
    return {
      action: 'CALL',
      confidence: 'MEDIUM',
      reason: `胜率${equity.toFixed(1)}% 略高于所需${calculatedPotOdds.toFixed(1)}%，勉强跟注`,
    };
  }

  // Marginal: small negative edge but position/odds might justify
  if (edge > -8 && stage !== 'river') {
    return {
      action: 'CALL',
      confidence: 'LOW',
      reason: `胜率${equity.toFixed(1)}% 接近所需${calculatedPotOdds.toFixed(1)}%，可以考虑跟注看下一张牌`,
    };
  }

  // Clear fold
  return {
    action: 'FOLD',
    confidence: edge < -20 ? 'HIGH' : 'MEDIUM',
    reason: `胜率${equity.toFixed(1)}% < 所需${calculatedPotOdds.toFixed(1)}%，建议弃牌`,
  };
}

/**
 * Get preflop recommendation based on starting hand strength and position.
 */
export function getPreflopRecommendation({ holeCards, position, numPlayers, isShortDeck, actions }) {
  const strength = evaluateStartingHand(holeCards, isShortDeck);

  // Adjust for position
  const positionBonus = getPositionBonus(position, numPlayers);

  // Adjust for prior actions
  const actionAdjustment = getActionAdjustment(actions);

  const adjustedStrength = Math.min(100, strength + positionBonus + actionAdjustment);

  if (adjustedStrength > 70) {
    return { action: 'RAISE', confidence: 'HIGH', raiseAmount: 0, reason: `起手牌强度${adjustedStrength.toFixed(0)}%` };
  }
  if (adjustedStrength > 45) {
    return { action: 'CALL', confidence: 'MEDIUM', reason: `起手牌强度${adjustedStrength.toFixed(0)}%` };
  }
  return { action: 'FOLD', confidence: 'MEDIUM', reason: `起手牌强度${adjustedStrength.toFixed(0)}%，建议弃牌` };
}

function evaluateStartingHand(cards, isShortDeck) {
  const [c1, c2] = cards;
  const isPair = c1.rank === c2.rank;
  const isSuited = c1.suit === c2.suit;
  const highCard = Math.max(c1.value, c2.value);
  const lowCard = Math.min(c1.value, c2.value);
  const gap = highCard - lowCard;

  let strength = 0;

  if (isPair) {
    strength = 50 + c1.value * 3; // AA=92, KK=89, ..., 22=56
  } else {
    strength = (highCard + lowCard) * 1.5;
    if (isSuited) strength += 8;
    if (gap <= 2) strength += 6; // Connected
    else if (gap <= 4) strength += 3; // Semi-connected
    if (highCard >= 13 && lowCard >= 11) strength += 10; // Two broadway
  }

  if (isShortDeck) {
    // Connected cards worth more
    if (gap <= 2) strength += 5;
    // Small pairs worth less
    if (isPair && c1.value < 9) strength -= 10;
  }

  return Math.min(100, Math.max(0, strength));
}

function getPositionBonus(position, numPlayers) {
  const bonuses = { 'btn': 12, 'co': 8, 'mp': 4, 'utg': -2, 'sb': 2, 'bb': 6 };
  return bonuses[position] || 0;
}

function getActionAdjustment(actions) {
  if (!actions || actions.length === 0) return 0;
  // If everyone folded, easier to open
  const allFolded = actions.every(a => a.type === 'fold');
  if (allFolded) return 5;
  // If there was a raise, need stronger hand
  const maxRaise = Math.max(...actions.filter(a => a.type === 'raise').map(a => a.amount || 0), 0);
  if (maxRaise > 0) return -15;
  return 0;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine/strategy.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add js/engine/strategy.js tests/engine/strategy.test.js
git commit -m "feat: add strategy engine with equity-based recommendations"
```

---

## Task 7: Card Selection UI Component

**Files:**
- Create: `js/ui/card-selector.js`
- Create: `js/ui/card-selector.css`

**Step 1: Implement card grid UI**

A 4x13 grid (standard) or 4x9 grid (short deck) of clickable cards. Selected cards are highlighted and disabled. Used for selecting hole cards and community cards.

```js
// js/ui/card-selector.js
import { RANKS, SHORT_RANKS, SUITS, SUIT_SYMBOLS, RANK_VALUES } from '../engine/card.js';

export function createCardGrid(onCardSelect, selectedCards = [], isShortDeck = false) {
  const container = document.createElement('div');
  container.className = 'card-grid';

  const ranks = isShortDeck ? SHORT_RANKS : RANKS;
  const selectedIds = new Set(selectedCards.map(c => `${c.rank}_${c.suit}`));

  for (const suit of SUITS) {
    for (const rank of ranks) {
      const btn = document.createElement('button');
      btn.className = 'card-btn';
      btn.dataset.rank = rank;
      btn.dataset.suit = suit;

      const isRed = suit === 'hearts' || suit === 'diamonds';
      btn.classList.toggle('card-red', isRed);
      btn.classList.toggle('card-black', !isRed);

      btn.textContent = `${rank}${SUIT_SYMBOLS[suit]}`;

      if (selectedIds.has(`${rank}_${suit}`)) {
        btn.classList.add('card-selected');
        btn.disabled = true;
      }

      btn.addEventListener('click', () => {
        onCardSelect({ rank, suit, value: RANK_VALUES[rank] });
      });

      container.appendChild(btn);
    }
  }

  return container;
}
```

**Step 2: Create card-selector.css**

```css
/* js/ui/card-selector.css */
.card-grid {
  display: grid;
  grid-template-columns: repeat(13, 1fr);
  gap: 3px;
  padding: 8px;
  max-width: 500px;
  margin: 0 auto;
}

.card-grid.short-deck {
  grid-template-columns: repeat(9, 1fr);
}

.card-btn {
  aspect-ratio: 0.7;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  padding: 2px;
  transition: all 0.15s;
  min-height: 36px;
}

.card-btn.card-red { color: #dc2626; }
.card-btn.card-black { color: #1a1a1a; }

.card-btn:hover:not(:disabled) {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}

.card-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.card-btn.card-selected {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

@media (max-width: 400px) {
  .card-grid { grid-template-columns: repeat(13, 1fr); gap: 2px; }
  .card-btn { font-size: 0.65rem; min-height: 30px; }
}
```

**Step 3: Commit**

```bash
git add js/ui/card-selector.js js/ui/card-selector.css
git commit -m "feat: add card selection UI component"
```

---

## Task 8: Game State Tracker

**Files:**
- Create: `js/ui/game-tracker.js`
- Create: `tests/ui/game-tracker.test.js`

**Step 1: Write the failing test**

```js
// tests/ui/game-tracker.test.js
import { describe, it, expect } from 'vitest';
import { GameState } from '../../js/ui/game-tracker.js';
import { createCard } from '../../js/engine/card.js';

const c = (rank, suit) => createCard(rank, suit);

describe('GameState', () => {
  it('initializes with correct defaults', () => {
    const state = new GameState({ numPlayers: 6, position: 'btn', isShortDeck: false });
    expect(state.stage).toBe('preflop');
    expect(state.holeCards).toEqual([]);
    expect(state.board).toEqual([]);
    expect(state.pot).toBe(0);
    expect(state.actions).toEqual([]);
  });

  it('transitions through stages correctly', () => {
    const state = new GameState({ numPlayers: 6, position: 'btn', isShortDeck: false });
    state.setHoleCards([c('A','spades'), c('K','hearts')]);
    expect(state.stage).toBe('preflop');

    state.advanceStage([c('Q','spades'), c('J','spades'), c('2','hearts')]);
    expect(state.stage).toBe('flop');
    expect(state.board).toHaveLength(3);

    state.advanceStage([c('T','diamonds')]);
    expect(state.stage).toBe('turn');
    expect(state.board).toHaveLength(4);

    state.advanceStage([c('3','clubs')]);
    expect(state.stage).toBe('river');
    expect(state.board).toHaveLength(5);
  });

  it('tracks pot from actions', () => {
    const state = new GameState({ numPlayers: 6, position: 'btn', isShortDeck: false });
    state.addAction({ type: 'call', amount: 10, player: 'utg' });
    state.addAction({ type: 'raise', amount: 30, player: 'co' });
    expect(state.pot).toBe(40);
    expect(state.callAmount).toBe(30);
  });

  it('tracks all-in actions', () => {
    const state = new GameState({ numPlayers: 6, position: 'btn', isShortDeck: false });
    state.addAction({ type: 'allin', amount: 200, player: 'utg' });
    expect(state.hasAllIn).toBe(true);
    expect(state.pot).toBe(200);
  });

  it('resets for new hand', () => {
    const state = new GameState({ numPlayers: 6, position: 'btn', isShortDeck: false });
    state.setHoleCards([c('A','spades'), c('K','hearts')]);
    state.addAction({ type: 'call', amount: 10, player: 'utg' });
    state.reset();
    expect(state.stage).toBe('setup');
    expect(state.holeCards).toEqual([]);
    expect(state.pot).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/game-tracker.test.js`
Expected: FAIL

**Step 3: Implement game-tracker.js**

```js
// js/ui/game-tracker.js
export const STAGES = ['setup', 'preflop', 'flop', 'turn', 'river', 'showdown'];

export const POSITIONS_9 = ['utg', 'utg1', 'mp', 'mp1', 'co', 'btn', 'sb', 'bb'];
export const POSITIONS_6 = ['utg', 'mp', 'co', 'btn', 'sb', 'bb'];
export const POSITIONS_4 = ['btn', 'sb', 'bb', 'utg'];
export const POSITIONS_2 = ['sb', 'bb'];

export class GameState {
  constructor(config = {}) {
    this.numPlayers = config.numPlayers || 6;
    this.position = config.position || 'btn';
    this.isShortDeck = config.isShortDeck || false;
    this.reset();
  }

  reset() {
    this.stage = 'setup';
    this.holeCards = [];
    this.board = [];
    this.pot = 0;
    this.callAmount = 0;
    this.actions = []; // actions for current round
    this.allActions = []; // all actions for entire hand
    this.hasAllIn = false;
    this.stageActions = { preflop: [], flop: [], turn: [], river: [] };
  }

  setConfig(config) {
    this.numPlayers = config.numPlayers || this.numPlayers;
    this.position = config.position || this.position;
    this.isShortDeck = config.isShortDeck ?? this.isShortDeck;
  }

  setHoleCards(cards) {
    if (cards.length !== 2) throw new Error('Must have exactly 2 hole cards');
    this.holeCards = cards;
    this.stage = 'preflop';
    this.actions = [];
  }

  advanceStage(newBoardCards) {
    const stageOrder = ['preflop', 'flop', 'turn', 'river'];
    const currentIdx = stageOrder.indexOf(this.stage);
    if (currentIdx >= stageOrder.length - 1) {
      this.stage = 'showdown';
      return;
    }

    // Save current round actions
    if (this.stage !== 'setup') {
      this.stageActions[this.stage] = [...this.actions];
    }

    this.stage = stageOrder[currentIdx + 1];
    this.board = [...this.board, ...newBoardCards];
    this.actions = [];
    this.callAmount = 0;
  }

  addAction(action) {
    this.actions.push(action);
    this.allActions.push({ ...action, stage: this.stage });

    if (action.type === 'allin') {
      this.hasAllIn = true;
      this.pot += action.amount;
      this.callAmount = action.amount;
    } else if (action.type === 'raise') {
      const previousBet = this.callAmount;
      this.pot += action.amount - previousBet;
      this.callAmount = action.amount;
    } else if (action.type === 'call') {
      this.pot += this.callAmount || action.amount;
    } else if (action.type === 'bet') {
      this.pot += action.amount;
      this.callAmount = action.amount;
    }
  }

  getCallAmount() {
    return this.callAmount;
  }

  getPositions() {
    if (this.numPlayers >= 8) return POSITIONS_9;
    if (this.numPlayers >= 6) return POSITIONS_6;
    if (this.numPlayers >= 4) return POSITIONS_4;
    return POSITIONS_2;
  }

  toJSON() {
    return {
      numPlayers: this.numPlayers,
      position: this.position,
      isShortDeck: this.isShortDeck,
      stage: this.stage,
      holeCards: this.holeCards,
      board: this.board,
      pot: this.pot,
      callAmount: this.callAmount,
      actions: this.allActions,
      hasAllIn: this.hasAllIn,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/game-tracker.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add js/ui/game-tracker.js tests/ui/game-tracker.test.js
git commit -m "feat: add game state tracker"
```

---

## Task 9: Main App UI - Setup Screen + Hole Card Selection

**Files:**
- Create: `js/ui/screens/setup-screen.js`
- Create: `js/ui/screens/setup-screen.css`
- Modify: `js/main.js`
- Modify: `css/styles.css`

**Step 1: Implement setup screen**

The setup screen lets the user:
1. Choose mode: Standard / Short Deck
2. Choose number of players (2-9)
3. Choose their position
4. Then transition to hole card selection

```js
// js/ui/screens/setup-screen.js
import { STAGES, POSITIONS_6, POSITIONS_9, POSITIONS_4, POSITIONS_2 } from '../game-tracker.js';

export function createSetupScreen(onComplete) {
  const container = document.createElement('div');
  container.className = 'screen setup-screen';

  container.innerHTML = `
    <h1 class="app-title">Poker Advisor</h1>

    <div class="setup-section">
      <label class="setup-label">牌组模式</label>
      <div class="toggle-group">
        <button class="toggle-btn active" data-mode="standard">标准 52张</button>
        <button class="toggle-btn" data-mode="short">短牌 36张</button>
      </div>
    </div>

    <div class="setup-section">
      <label class="setup-label">玩家人数</label>
      <div class="player-count-group">
        ${[2,3,4,5,6,7,8,9].map(n =>
          `<button class="count-btn ${n === 6 ? 'active' : ''}" data-count="${n}">${n}</button>`
        ).join('')}
      </div>
    </div>

    <div class="setup-section">
      <label class="setup-label">你的位置</label>
      <div class="position-group" id="positionGroup"></div>
    </div>

    <button class="primary-btn" id="startBtn">开始</button>
  `;

  let isShortDeck = false;
  let numPlayers = 6;
  let position = 'btn';

  // Mode toggle
  container.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      isShortDeck = btn.dataset.mode === 'short';
    });
  });

  // Player count
  container.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      numPlayers = parseInt(btn.dataset.count);
      updatePositions();
    });
  });

  function updatePositions() {
    const group = container.querySelector('#positionGroup');
    const positions = getPositions(numPlayers);
    group.innerHTML = positions.map(p =>
      `<button class="pos-btn ${p === 'btn' ? 'active' : ''}" data-pos="${p}">${p.toUpperCase()}</button>`
    ).join('');

    group.querySelectorAll('.pos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        position = btn.dataset.pos;
      });
    });
  }

  updatePositions();

  container.querySelector('#startBtn').addEventListener('click', () => {
    onComplete({ isShortDeck, numPlayers, position });
  });

  return container;
}

function getPositions(n) {
  if (n >= 8) return POSITIONS_9;
  if (n >= 6) return POSITIONS_6;
  if (n >= 4) return POSITIONS_4;
  return POSITIONS_2;
}
```

**Step 2: Implement hole card selection screen**

```js
// js/ui/screens/hole-cards-screen.js
import { createCardGrid } from '../card-selector.js';
import { cardToString } from '../../engine/card.js';

export function createHoleCardsScreen(gameState, onComplete) {
  const container = document.createElement('div');
  container.className = 'screen hole-cards-screen';

  const selectedCards = [];

  container.innerHTML = `
    <div class="screen-header">
      <h2>选择你的底牌</h2>
      <div class="selected-display" id="selectedDisplay">已选: 0/2</div>
    </div>
    <div id="cardGrid"></div>
    <button class="primary-btn" id="confirmBtn" disabled>确认</button>
  `;

  const grid = createCardGrid(
    (card) => {
      if (selectedCards.length >= 2) return;
      selectedCards.push(card);
      refreshGrid();
    },
    [],
    gameState.isShortDeck
  );
  container.querySelector('#cardGrid').appendChild(grid);

  function refreshGrid() {
    const display = container.querySelector('#selectedDisplay');
    display.textContent = `已选: ${selectedCards.length}/2 — ${selectedCards.map(cardToString).join(' ')}`;
    container.querySelector('#confirmBtn').disabled = selectedCards.length !== 2;

    // Refresh grid with selected cards disabled
    const newGrid = createCardGrid(
      (card) => {
        if (selectedCards.length >= 2) return;
        selectedCards.push(card);
        refreshGrid();
      },
      selectedCards,
      gameState.isShortDeck
    );
    const gridContainer = container.querySelector('#cardGrid');
    gridContainer.innerHTML = '';
    gridContainer.appendChild(newGrid);
  }

  container.querySelector('#confirmBtn').addEventListener('click', () => {
    if (selectedCards.length === 2) {
      onComplete(selectedCards);
    }
  });

  return container;
}
```

**Step 3: Update main.js to wire screens**

```js
// js/main.js
import './js/ui/screens/setup-screen.css';
import './js/ui/card-selector.css';
import { GameState } from './js/ui/game-tracker.js';
import { createSetupScreen } from './js/ui/screens/setup-screen.js';
import { createHoleCardsScreen } from './js/ui/screens/hole-cards-screen.js';

const app = document.getElementById('app');
let gameState;

function showScreen(element) {
  app.innerHTML = '';
  app.appendChild(element);
}

function startSetup() {
  const screen = createSetupScreen((config) => {
    gameState = new GameState(config);
    showHoleCardSelection();
  });
  showScreen(screen);
}

function showHoleCardSelection() {
  const screen = createHoleCardsScreen(gameState, (cards) => {
    gameState.setHoleCards(cards);
    showBettingInput();
  });
  showScreen(screen);
}

function showBettingInput() {
  // TODO: Task 10
  app.innerHTML = '<h2>Betting input - coming next</h2>';
}

startSetup();
```

**Step 4: Update styles.css with base styles**

Add mobile-first base styles to `css/styles.css`:

```css
/* css/styles.css */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f172a;
  color: #f1f5f9;
  min-height: 100vh;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

#app {
  max-width: 500px;
  margin: 0 auto;
  padding: 12px;
}

.screen { display: flex; flex-direction: column; gap: 16px; }

.app-title {
  text-align: center;
  font-size: 1.5rem;
  color: #f59e0b;
  padding: 12px 0;
}

.setup-label {
  font-size: 0.9rem;
  color: #94a3b8;
  margin-bottom: 6px;
  display: block;
}

.toggle-group, .player-count-group, .position-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.toggle-btn, .count-btn, .pos-btn {
  padding: 8px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn.active, .count-btn.active, .pos-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.primary-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.15s;
}

.primary-btn:disabled {
  background: #334155;
  cursor: not-allowed;
}

.primary-btn:active:not(:disabled) {
  background: #1d4ed8;
}

.screen-header {
  text-align: center;
}

.screen-header h2 {
  font-size: 1.1rem;
  color: #f59e0b;
}

.selected-display {
  font-size: 1rem;
  color: #e2e8f0;
  margin-top: 4px;
}
```

**Step 5: Verify app loads in browser**

Run: `npm run dev`
Expected: Setup screen renders at localhost, can select mode/count/position

**Step 6: Commit**

```bash
git add js/ui/screens/ js/main.js css/styles.css
git commit -m "feat: add setup screen and hole card selection UI"
```

---

## Task 10: Betting Input Screen

**Files:**
- Create: `js/ui/screens/betting-screen.js`
- Create: `js/ui/screens/betting-screen.css`
- Modify: `js/main.js` (wire betting screen)

**Step 1: Implement betting input**

Shows a simple form for each previous player's action: fold/call/raise(amt)/all-in(amt). Displays current pot and call amount. "Get Advice" button triggers calculation.

```js
// js/ui/screens/betting-screen.js
import { cardToString } from '../../engine/card.js';

export function createBettingScreen(gameState, onGetAdvice) {
  const container = document.createElement('div');
  container.className = 'screen betting-screen';

  const stageNames = { preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌' };

  container.innerHTML = `
    <div class="screen-header">
      <div class="stage-badge">${stageNames[gameState.stage]}</div>
      <div class="hole-cards-display">
        底牌: ${gameState.holeCards.map(cardToString).join(' ')}
      </div>
      ${gameState.board.length > 0 ? `
        <div class="board-display">
          公共牌: ${gameState.board.map(cardToString).join(' ')}
        </div>
      ` : ''}
    </div>

    <div class="pot-info">
      <span>底池: <strong id="potDisplay">${gameState.pot}</strong></span>
      <span>需要跟注: <strong id="callDisplay">${gameState.callAmount}</strong></span>
    </div>

    <div class="actions-section">
      <label class="setup-label">前人操作</label>
      <div id="actionList"></div>
      <button class="add-action-btn" id="addActionBtn">+ 添加操作</button>
    </div>

    <button class="primary-btn" id="adviceBtn">获取建议</button>
  `;

  const actions = [];
  const actionList = container.querySelector('#actionList');

  container.querySelector('#addActionBtn').addEventListener('click', () => {
    const actionDiv = createActionRow((action) => {
      gameState.addAction(action);
      updatePotDisplay();
    });
    actionList.appendChild(actionDiv);
  });

  function updatePotDisplay() {
    container.querySelector('#potDisplay').textContent = gameState.pot;
    container.querySelector('#callDisplay').textContent = gameState.callAmount;
  }

  container.querySelector('#adviceBtn').addEventListener('click', () => {
    onGetAdvice(gameState);
  });

  return container;
}

function createActionRow(onAction) {
  const div = document.createElement('div');
  div.className = 'action-row';
  div.innerHTML = `
    <select class="action-type">
      <option value="fold">弃牌</option>
      <option value="call">跟注</option>
      <option value="raise">加注</option>
      <option value="allin">All-In</option>
    </select>
    <input type="number" class="action-amount" placeholder="金额" min="0" disabled>
  `;

  const typeSelect = div.querySelector('.action-type');
  const amountInput = div.querySelector('.action-amount');

  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    amountInput.disabled = type === 'fold' || type === 'call';
    if (type === 'call') amountInput.value = '';
  });

  // Auto-submit on change
  const submitAction = () => {
    const type = typeSelect.value;
    const amount = parseInt(amountInput.value) || 0;
    if (type !== 'fold' && type !== 'call' && amount <= 0) return;
    onAction({ type, amount });
    div.classList.add('action-locked');
    typeSelect.disabled = true;
    amountInput.disabled = true;
  };

  amountInput.addEventListener('change', submitAction);
  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === 'fold' || typeSelect.value === 'call') submitAction();
  });

  return div;
}
```

**Step 2: Add betting-screen.css**

```css
/* js/ui/screens/betting-screen.css */
.stage-badge {
  display: inline-block;
  background: #f59e0b;
  color: #0f172a;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.9rem;
}

.hole-cards-display, .board-display {
  margin-top: 8px;
  font-size: 1rem;
}

.pot-info {
  display: flex;
  justify-content: space-between;
  background: #1e293b;
  padding: 12px;
  border-radius: 8px;
}

.pot-info strong {
  color: #f59e0b;
}

.actions-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-type {
  flex: 1;
  padding: 10px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.action-amount {
  width: 80px;
  padding: 10px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.action-amount:disabled, .action-type:disabled {
  opacity: 0.5;
}

.action-locked { opacity: 0.6; }

.add-action-btn {
  padding: 8px;
  border: 1px dashed #334155;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.add-action-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
```

**Step 3: Commit**

```bash
git add js/ui/screens/betting-screen.js js/ui/screens/betting-screen.css js/main.js
git commit -m "feat: add betting input screen"
```

---

## Task 11: Result Display Screen

**Files:**
- Create: `js/ui/screens/result-screen.js`
- Create: `js/ui/screens/result-screen.css`
- Modify: `js/main.js` (wire result screen)

**Step 1: Implement result display**

Large, bold display of the recommended action. Shows equity %, hand type, and pot odds.

```js
// js/ui/screens/result-screen.js
import { cardToString } from '../../engine/card.js';
import { getHandName } from '../../engine/hand-evaluator.js';

export function createResultScreen(gameState, recommendation, equityData, onContinue, onNewHand) {
  const container = document.createElement('div');
  container.className = 'screen result-screen';

  const actionColors = {
    FOLD: '#ef4444',
    CALL: '#22c55e',
    CHECK: '#3b82f6',
    RAISE: '#f59e0b',
    BET: '#f59e0b',
  };
  const actionColor = actionColors[recommendation.action] || '#94a3b8';

  const stageNames = { preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌' };
  const isLastStage = gameState.stage === 'river';

  container.innerHTML = `
    <div class="result-card" style="border-color: ${actionColor}">
      <div class="result-action" style="color: ${actionColor}">
        ${recommendation.action === 'FOLD' ? '弃牌' :
          recommendation.action === 'CALL' ? '跟注' :
          recommendation.action === 'CHECK' ? '过牌' :
          recommendation.action === 'RAISE' ? `加注 ${recommendation.raiseAmount || ''}` :
          recommendation.action === 'BET' ? `下注 ${recommendation.betAmount || ''}` :
          recommendation.action}
      </div>
      <div class="result-equity">${equityData.equity.toFixed(1)}% 胜率</div>
      ${equityData.handType ? `<div class="result-hand-type">${equityData.handType}</div>` : ''}
      ${recommendation.raiseAmount ? `<div class="result-detail">建议加注到: ${recommendation.raiseAmount}</div>` : ''}
    </div>

    <div class="result-reason">${recommendation.reason}</div>

    ${gameState.callAmount > 0 ? `
      <div class="result-pot-odds">
        底池赔率: ${equityData.potOdds.toFixed(1)}%
      </div>
    ` : ''}

    <div class="result-confidence confidence-${recommendation.confidence.toLowerCase()}">
      置信度: ${recommendation.confidence === 'HIGH' ? '高' : recommendation.confidence === 'MEDIUM' ? '中' : '低'}
    </div>

    <div class="result-buttons">
      ${!isLastStage ? `<button class="primary-btn" id="continueBtn">下一轮</button>` : ''}
      <button class="secondary-btn" id="newHandBtn">新一手牌</button>
    </div>
  `;

  container.querySelector('#continueBtn')?.addEventListener('click', () => onContinue());
  container.querySelector('#newHandBtn')?.addEventListener('click', () => onNewHand());

  return container;
}
```

**Step 2: Add result-screen.css**

```css
/* js/ui/screens/result-screen.css */
.result-card {
  text-align: center;
  padding: 24px;
  border: 3px solid;
  border-radius: 12px;
  background: #1e293b;
}

.result-action {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 2px;
}

.result-equity {
  font-size: 1.5rem;
  color: #e2e8f0;
  margin-top: 8px;
}

.result-hand-type {
  font-size: 1rem;
  color: #94a3b8;
  margin-top: 4px;
}

.result-detail {
  font-size: 0.95rem;
  color: #cbd5e1;
  margin-top: 8px;
}

.result-reason {
  text-align: center;
  padding: 12px;
  color: #94a3b8;
  font-size: 0.9rem;
}

.result-pot-odds {
  text-align: center;
  color: #64748b;
  font-size: 0.85rem;
}

.result-confidence {
  text-align: center;
  padding: 4px 8px;
  font-size: 0.85rem;
}

.confidence-high { color: #22c55e; }
.confidence-medium { color: #f59e0b; }
.confidence-low { color: #ef4444; }

.result-buttons {
  display: flex;
  gap: 12px;
}

.secondary-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  font-size: 1rem;
  cursor: pointer;
}
```

**Step 3: Update main.js to wire full flow**

```js
// js/main.js (full rewrite with complete flow)
import './css/styles.css';
import './js/ui/screens/setup-screen.css';
import './js/ui/screens/betting-screen.css';
import './js/ui/screens/result-screen.css';
import './js/ui/card-selector.css';

import { GameState } from './js/ui/game-tracker.js';
import { createSetupScreen } from './js/ui/screens/setup-screen.js';
import { createHoleCardsScreen } from './js/ui/screens/hole-cards-screen.js';
import { createBettingScreen } from './js/ui/screens/betting-screen.js';
import { createResultScreen } from './js/ui/screens/result-screen.js';
import { createCommunityCardsScreen } from './js/ui/screens/community-cards-screen.js';
import { calculateEquity, calculatePotOdds } from './js/engine/monte-carlo.js';
import { getRecommendation, getPreflopRecommendation } from './js/engine/strategy.js';
import { evaluateHand, getHandName } from './js/engine/hand-evaluator.js';

const app = document.getElementById('app');
let gameState;

function showScreen(element) {
  app.innerHTML = '';
  app.appendChild(element);
}

function startSetup() {
  gameState = new GameState();
  showScreen(createSetupScreen((config) => {
    gameState.setConfig(config);
    showHoleCardSelection();
  }));
}

function showHoleCardSelection() {
  showScreen(createHoleCardsScreen(gameState, (cards) => {
    gameState.setHoleCards(cards);
    showBettingInput();
  }));
}

function showBettingInput() {
  showScreen(createBettingScreen(gameState, () => {
    calculateAndShowResult();
  }));
}

function showCommunityCardSelection() {
  const numCards = gameState.stage === 'flop' ? 0 : (gameState.stage === 'turn' ? 1 : 1);
  // flop: need 3 cards, turn: need 1, river: need 1
  const needed = gameState.stage === 'flop' ? 3 : 1;
  showScreen(createCommunityCardsScreen(gameState, needed, (cards) => {
    gameState.advanceStage(cards);
    showBettingInput();
  }));
}

function calculateAndShowResult() {
  let recommendation, equityData;

  if (gameState.stage === 'preflop' && gameState.board.length === 0) {
    // Preflop: use preflop chart + quick sim
    recommendation = getPreflopRecommendation({
      holeCards: gameState.holeCards,
      position: gameState.position,
      numPlayers: gameState.numPlayers,
      isShortDeck: gameState.isShortDeck,
      actions: gameState.actions,
    });

    // Also run a quick simulation
    const result = calculateEquity(
      [gameState.holeCards], [], [],
      { iterations: 3000, shortDeck: gameState.isShortDeck, numRandomOpponents: gameState.numPlayers - 1 }
    );
    equityData = {
      equity: result.equities[0] * 100,
      handType: null,
      potOdds: gameState.callAmount > 0 ? calculatePotOdds(gameState.pot, gameState.callAmount) : 0,
    };

    // If we have betting, recalculate based on equity
    if (gameState.callAmount > 0) {
      recommendation = getRecommendation({
        equity: equityData.equity,
        potOdds: equityData.potOdds,
        potSize: gameState.pot,
        callAmount: gameState.callAmount,
        stage: gameState.stage,
        position: gameState.position,
        isShortDeck: gameState.isShortDeck,
      });
    }
  } else {
    // Post-flop: full Monte Carlo
    const result = calculateEquity(
      [gameState.holeCards], [], gameState.board,
      { iterations: 5000, shortDeck: gameState.isShortDeck, numRandomOpponents: gameState.numPlayers - 1 }
    );

    const currentHand = evaluateHand([...gameState.holeCards, ...gameState.board], { shortDeck: gameState.isShortDeck });

    equityData = {
      equity: result.equities[0] * 100,
      handType: getHandName(currentHand, gameState.isShortDeck),
      potOdds: gameState.callAmount > 0 ? calculatePotOdds(gameState.pot, gameState.callAmount) : 0,
    };

    recommendation = getRecommendation({
      equity: equityData.equity,
      potOdds: equityData.potOdds,
      potSize: gameState.pot,
      callAmount: gameState.callAmount,
      stage: gameState.stage,
      position: gameState.position,
      isShortDeck: gameState.isShortDeck,
    });
  }

  showScreen(createResultScreen(
    gameState, recommendation, equityData,
    () => showCommunityCardSelection(),
    () => startNewHand()
  ));
}

function startNewHand() {
  // TODO: save current hand to history (Task 13)
  startSetup();
}

startSetup();
```

**Step 4: Commit**

```bash
git add js/ui/screens/result-screen.js js/ui/screens/result-screen.css js/main.js
git commit -m "feat: add result display and wire full game flow"
```

---

## Task 12: Community Card Selection Screen

**Files:**
- Create: `js/ui/screens/community-cards-screen.js`
- Modify: `js/main.js` (already referenced in Task 11)

**Step 1: Implement community card screen**

Similar to hole card selection but for 1 or 3 community cards.

```js
// js/ui/screens/community-cards-screen.js
import { createCardGrid } from '../card-selector.js';
import { cardToString } from '../../engine/card.js';

export function createCommunityCardsScreen(gameState, numCards, onComplete) {
  const container = document.createElement('div');
  container.className = 'screen community-screen';

  const selectedCards = [];
  const allSelected = [...gameState.holeCards, ...gameState.board];

  const stageNames = { flop: '翻牌', turn: '转牌', river: '河牌' };
  const nextStage = gameState.stage === 'preflop' ? 'flop' :
                    gameState.stage === 'flop' ? 'turn' : 'river';

  container.innerHTML = `
    <div class="screen-header">
      <h2>选择${stageNames[nextStage] || '公共'}牌 (${numCards}张)</h2>
      <div class="board-existing">
        ${gameState.board.length > 0 ? `已有: ${gameState.board.map(cardToString).join(' ')}` : ''}
      </div>
      <div class="selected-display" id="selectedDisplay">已选: 0/${numCards}</div>
    </div>
    <div id="cardGrid"></div>
    <button class="primary-btn" id="confirmBtn" disabled>确认</button>
  `;

  function refreshGrid() {
    const display = container.querySelector('#selectedDisplay');
    display.textContent = `已选: ${selectedCards.length}/${numCards} — ${selectedCards.map(cardToString).join(' ')}`;
    container.querySelector('#confirmBtn').disabled = selectedCards.length !== numCards;

    const newGrid = createCardGrid(
      (card) => {
        if (selectedCards.length >= numCards) return;
        selectedCards.push(card);
        refreshGrid();
      },
      [...allSelected, ...selectedCards],
      gameState.isShortDeck
    );
    const gridContainer = container.querySelector('#cardGrid');
    gridContainer.innerHTML = '';
    gridContainer.appendChild(newGrid);
  }

  refreshGrid();

  container.querySelector('#confirmBtn').addEventListener('click', () => {
    if (selectedCards.length === numCards) {
      onComplete(selectedCards);
    }
  });

  return container;
}
```

**Step 2: Commit**

```bash
git add js/ui/screens/community-cards-screen.js
git commit -m "feat: add community card selection screen"
```

---

## Task 13: Hand History Storage

**Files:**
- Create: `js/storage/history.js`
- Create: `tests/storage/history.test.js`

**Step 1: Write the failing test**

```js
// tests/storage/history.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { HandHistory, STORAGE_KEY } from '../../js/storage/history.js';

describe('HandHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves hand records', () => {
    const history = new HandHistory();
    history.saveHand({
      holeCards: [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'hearts' }],
      board: [],
      actions: [],
      result: { action: 'CALL', equity: 65 },
      timestamp: Date.now(),
    });

    const hands = history.getAll();
    expect(hands).toHaveLength(1);
    expect(hands[0].result.action).toBe('CALL');
  });

  it('returns empty array when no history', () => {
    const history = new HandHistory();
    expect(history.getAll()).toEqual([]);
  });

  it('clears history', () => {
    const history = new HandHistory();
    history.saveHand({ result: { action: 'FOLD' }, timestamp: Date.now() });
    history.clear();
    expect(history.getAll()).toEqual([]);
  });

  it('limits stored hands to 200', () => {
    const history = new HandHistory();
    for (let i = 0; i < 250; i++) {
      history.saveHand({ result: { action: 'FOLD' }, timestamp: Date.now() });
    }
    expect(history.getAll()).toHaveLength(200);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage/history.test.js`
Expected: FAIL

**Step 3: Implement history.js**

```js
// js/storage/history.js
export const STORAGE_KEY = 'poker_advisor_history';
const MAX_HANDS = 200;

export class HandHistory {
  saveHand(handRecord) {
    const hands = this.getAll();
    hands.unshift({
      ...handRecord,
      id: Date.now() + Math.random(),
    });
    // Keep only last MAX_HANDS
    const trimmed = hands.slice(0, MAX_HANDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  getStats() {
    const hands = this.getAll();
    if (hands.length === 0) return null;

    const actions = { FOLD: 0, CALL: 0, CHECK: 0, RAISE: 0, BET: 0 };
    for (const h of hands) {
      if (h.result?.action) actions[h.result.action] = (actions[h.result.action] || 0) + 1;
    }
    return { total: hands.length, actions };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/storage/history.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add js/storage/history.js tests/storage/history.test.js
git commit -m "feat: add hand history storage"
```

---

## Task 14: History Review Screen

**Files:**
- Create: `js/ui/screens/history-screen.js`
- Create: `js/ui/screens/history-screen.css`
- Modify: `js/main.js` (add history button + navigation)

**Step 1: Implement history screen**

Shows list of past hands with key info. Can tap to see details.

```js
// js/ui/screens/history-screen.js
import { HandHistory } from '../../storage/history.js';

export function createHistoryScreen(onBack) {
  const container = document.createElement('div');
  container.className = 'screen history-screen';

  const history = new HandHistory();
  const hands = history.getAll();

  const actionLabels = { FOLD: '弃牌', CALL: '跟注', CHECK: '过牌', RAISE: '加注', BET: '下注' };
  const actionColors = { FOLD: '#ef4444', CALL: '#22c55e', CHECK: '#3b82f6', RAISE: '#f59e0b', BET: '#f59e0b' };

  container.innerHTML = `
    <div class="screen-header">
      <h2>历史记录</h2>
      ${hands.length > 0 ? `<div class="history-stats">${history.getStats().total} 手牌</div>` : ''}
    </div>
    ${hands.length === 0 ? '<div class="empty-state">暂无历史记录</div>' : ''}
    <div class="history-list">
      ${hands.map((hand, i) => `
        <div class="history-item">
          <div class="history-action" style="color: ${actionColors[hand.result?.action] || '#94a3b8'}">
            ${actionLabels[hand.result?.action] || hand.result?.action}
          </div>
          <div class="history-detail">
            ${hand.result?.equity ? `${hand.result.equity.toFixed(1)}%` : ''}
            ${hand.isShortDeck ? ' [短牌]' : ''}
          </div>
          <div class="history-time">${new Date(hand.timestamp).toLocaleString('zh-CN')}</div>
        </div>
      `).join('')}
    </div>
    <button class="secondary-btn" id="backBtn">返回</button>
  `;

  container.querySelector('#backBtn').addEventListener('click', onBack);

  return container;
}
```

**Step 2: Commit**

```bash
git add js/ui/screens/history-screen.js js/ui/screens/history-screen.css js/main.js
git commit -m "feat: add history review screen"
```

---

## Task 15: PWA Support + Mobile Polish

**Files:**
- Create: `manifest.json`
- Create: `sw.js`
- Modify: `index.html` (add manifest + meta tags)
- Modify: `css/styles.css` (final polish)

**Step 1: Create manifest.json**

```json
{
  "name": "Poker Advisor",
  "short_name": "Poker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#2563eb",
  "icons": []
}
```

**Step 2: Create sw.js (minimal service worker)**

```js
const CACHE_NAME = 'poker-advisor-v1';
const ASSETS = ['/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```

**Step 3: Update index.html with PWA meta tags**

Add to `<head>`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2563eb">
```

**Step 4: Register service worker in main.js**

Add at the beginning of main.js:
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

**Step 5: Final mobile CSS polish**

Ensure all elements are touch-friendly (min 44px tap targets), text is readable, and the layout works on 320px-428px width screens.

**Step 6: Test full flow on mobile browser**

Run: `npm run dev`
Open on phone browser via local IP. Test full flow: setup → hole cards → betting → result → next round → new hand → history.

**Step 7: Commit**

```bash
git add manifest.json sw.js index.html css/styles.css js/main.js
git commit -m "feat: add PWA support and mobile polish"
```

---

## Summary

| Task | Component | Files |
|------|-----------|-------|
| 1 | Project scaffolding | 5 files |
| 2 | Card types & deck | 2 files |
| 3 | Hand evaluator (standard) | 2 files |
| 4 | Hand evaluator (short deck tests) | 1 file |
| 5 | Monte Carlo engine | 2 files |
| 6 | Strategy engine | 2 files |
| 7 | Card selection UI | 2 files |
| 8 | Game state tracker | 2 files |
| 9 | Setup + hole card screen | 5 files |
| 10 | Betting input screen | 3 files |
| 11 | Result display screen | 3 files |
| 12 | Community card screen | 1 file |
| 13 | Hand history storage | 2 files |
| 14 | History review screen | 3 files |
| 15 | PWA + mobile polish | 4 files |

**Total: ~35 files, 15 tasks**
