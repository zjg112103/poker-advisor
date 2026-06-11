/**
 * Poker Advisor - Main Application Entry Point.
 * Wires all screens together into a complete game flow.
 */

// CSS imports (side effects)
import './css/styles.css';
import './js/ui/card-selector.css';
import './js/ui/screens/setup-screen.css';
import './js/ui/screens/betting-screen.css';
import './js/ui/screens/result-screen.css';

// Engine modules
import { GameState } from './js/ui/game-tracker.js';
import { calculateEquity, calculatePotOdds } from './js/engine/monte-carlo.js';
import { getRecommendation, getPreflopRecommendation } from './js/engine/strategy.js';
import { evaluateHand, getHandName } from './js/engine/hand-evaluator.js';

// Screen factories
import { createSetupScreen } from './js/ui/screens/setup-screen.js';
import { createHoleCardsScreen } from './js/ui/screens/hole-cards-screen.js';
import { createBettingScreen } from './js/ui/screens/betting-screen.js';
import { createResultScreen } from './js/ui/screens/result-screen.js';
import { createCommunityCardsScreen } from './js/ui/screens/community-cards-screen.js';
import { createHistoryScreen } from './js/ui/screens/history-screen.js';

// Storage
import { HandHistory } from './js/storage/history.js';

const app = document.getElementById('app');
const handHistory = new HandHistory();
let gameState = null;

// ---------------------------------------------------------------------------
// Screen helper
// ---------------------------------------------------------------------------

function showScreen(element) {
  app.innerHTML = '';
  app.appendChild(element);
}

// ---------------------------------------------------------------------------
// App flow
// ---------------------------------------------------------------------------

function startSetup() {
  const screen = createSetupScreen(({ isShortDeck, numPlayers, position }) => {
    gameState = new GameState({ numPlayers, position, isShortDeck });
    showHoleCardSelection();
  });

  // Add a history button at the top
  const historyBtn = document.createElement('button');
  historyBtn.className = 'secondary-btn';
  historyBtn.style.cssText = 'margin-bottom: 8px; padding: 8px; font-size: 0.85rem;';
  historyBtn.textContent = '历史记录';
  historyBtn.addEventListener('click', () => showHistoryScreen());
  screen.insertBefore(historyBtn, screen.firstChild);

  showScreen(screen);
}

function showHoleCardSelection() {
  const screen = createHoleCardsScreen(gameState, (selectedCards) => {
    gameState.setHoleCards(selectedCards);
    showBettingInput();
  });
  showScreen(screen);
}

function showBettingInput() {
  const screen = createBettingScreen(gameState, () => {
    calculateAndShowResult();
  });
  showScreen(screen);
}

async function calculateAndShowResult() {
  const equity = 0;
  const potOdds = 0;
  let recommendation;
  let equityData;
  let handType = '';

  const numRandomOpponents = gameState.numPlayers - 1;

  if (gameState.stage === 'preflop' && gameState.boardCards.length === 0) {
    // Preflop with no board: use preflop recommendation for quick advice
    const preflopRec = getPreflopRecommendation({
      holeCards: gameState.holeCards,
      position: gameState.position,
      numPlayers: gameState.numPlayers,
      isShortDeck: gameState.isShortDeck,
      actions: gameState.actions,
    });

    // Also run Monte Carlo simulation
    const simResult = await calculateEquity(
      [gameState.holeCards],
      [],
      [],
      { iterations: 3000, shortDeck: gameState.isShortDeck, numRandomOpponents },
    );

    const equityPct = simResult.equities[0] * 100;

    if (gameState.callAmount > 0) {
      // Recalculate with getRecommendation using equity
      const requiredEquity = calculatePotOdds(gameState.pot, gameState.callAmount);
      recommendation = getRecommendation({
        equity: equityPct,
        potOdds: requiredEquity,
        potSize: gameState.pot,
        callAmount: gameState.callAmount,
        stage: gameState.stage,
        position: gameState.position,
        isShortDeck: gameState.isShortDeck,
        numPlayers: gameState.numPlayers,
      });
      equityData = {
        equity: simResult.equities[0],
        handType: null,
        potOdds: requiredEquity / 100,
      };
    } else {
      recommendation = preflopRec;
      equityData = {
        equity: simResult.equities[0],
        handType: null,
        potOdds: 0,
      };
    }
  } else {
    // Post-flop (or preflop with board cards somehow)
    const simResult = await calculateEquity(
      [gameState.holeCards],
      [],
      gameState.boardCards,
      { iterations: 5000, shortDeck: gameState.isShortDeck, numRandomOpponents },
    );

    const equityPct = simResult.equities[0] * 100;

    // Evaluate hand type
    if (gameState.boardCards.length >= 3) {
      const allCards = [...gameState.holeCards, ...gameState.boardCards];
      const evalResult = evaluateHand(allCards, { shortDeck: gameState.isShortDeck });
      handType = getHandName(evalResult, gameState.isShortDeck);
    }

    const requiredEquity = calculatePotOdds(gameState.pot, gameState.callAmount);

    recommendation = getRecommendation({
      equity: equityPct,
      potOdds: requiredEquity,
      potSize: gameState.pot,
      callAmount: gameState.callAmount,
      stage: gameState.stage,
      position: gameState.position,
      isShortDeck: gameState.isShortDeck,
      numPlayers: gameState.numPlayers,
    });

    equityData = {
      equity: simResult.equities[0],
      handType: handType || null,
      potOdds: gameState.callAmount > 0 ? requiredEquity / 100 : 0,
    };
  }

  // Save to history
  handHistory.saveHand({
    action: recommendation.action,
    equity: equityData.equity,
    handType: equityData.handType,
    confidence: recommendation.confidence,
    stage: gameState.stage,
    isShortDeck: gameState.isShortDeck,
    numPlayers: gameState.numPlayers,
    position: gameState.position,
    timestamp: Date.now(),
  });

  showResultScreen(recommendation, equityData);
}

function showResultScreen(recommendation, equityData) {
  const screen = createResultScreen(
    gameState,
    recommendation,
    equityData,
    () => showCommunityCardSelection(),
    () => startNewHand(),
  );
  showScreen(screen);
}

function showCommunityCardSelection() {
  // Determine how many cards to select for next stage
  let numCards;
  if (gameState.stage === 'preflop') {
    numCards = 3; // going to flop
  } else if (gameState.stage === 'flop') {
    numCards = 1; // going to turn
  } else if (gameState.stage === 'turn') {
    numCards = 1; // going to river
  } else {
    // Should not happen, but fallback
    startNewHand();
    return;
  }

  const screen = createCommunityCardsScreen(gameState, numCards, (newCards) => {
    gameState.advanceStage(newCards);
    showBettingInput();
  });
  showScreen(screen);
}

function showHistoryScreen() {
  const screen = createHistoryScreen(() => startSetup());
  showScreen(screen);
}

function startNewHand() {
  startSetup();
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

startSetup();
