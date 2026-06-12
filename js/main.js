/**
 * Poker Advisor - Main Application Entry Point.
 * Wires all screens together into a complete game flow.
 */

// CSS imports (side effects)
import '../css/styles.css';
import './ui/card-selector.css';
import './ui/screens/setup-screen.css';
import './ui/screens/betting-screen.css';
import './ui/screens/result-screen.css';

// Engine modules
import { GameState } from './ui/game-tracker.js';
import { calculateEquity, calculatePotOdds } from './engine/monte-carlo.js';
import { getRecommendation, getPreflopRecommendation } from './engine/strategy.js';
import { evaluateHand, getHandName } from './engine/hand-evaluator.js';

// Screen factories
import { createSetupScreen } from './ui/screens/setup-screen.js';
import { createHoleCardsScreen } from './ui/screens/hole-cards-screen.js';
import { createBettingScreen } from './ui/screens/betting-screen.js';
import { createResultScreen } from './ui/screens/result-screen.js';
import { createCommunityCardsScreen } from './ui/screens/community-cards-screen.js';
import { createHistoryScreen } from './ui/screens/history-screen.js';

// Storage
import { HandHistory } from './storage/history.js';

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
  const screen = createSetupScreen(({ isShortDeck, numPlayers, position, bigBlind }) => {
    gameState = new GameState({ numPlayers, position, isShortDeck, bigBlind });
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
  const screen = createBettingScreen(gameState, async () => {
    await calculateAndShowResult();
  });
  showScreen(screen);
}

async function calculateAndShowResult() {
  let recommendation;
  let equityData;
  let handType = '';

  // Get opponent range info for range-weighted simulation
  const opponentRanges = gameState.getOpponentRanges();
  const numActiveOpponents = opponentRanges.length;
  const rangePercentages = opponentRanges.map(o => o.rangePercent);

  if (gameState.stage === 'preflop' && gameState.boardCards.length === 0) {
    // Preflop with no board: use preflop recommendation for quick advice
    const preflopRec = getPreflopRecommendation({
      holeCards: gameState.holeCards,
      position: gameState.position,
      numPlayers: gameState.numPlayers,
      isShortDeck: gameState.isShortDeck,
      actions: gameState.actions,
    });

    // Run Monte Carlo with opponent ranges
    const simResult = await calculateEquity(
      [gameState.holeCards],
      [],
      [],
      { iterations: 3000, shortDeck: gameState.isShortDeck, numRandomOpponents: numActiveOpponents, opponentRanges: rangePercentages },
    );

    const equityPct = simResult.equities[0] * 100;

    if (gameState.callAmount > 0) {
      const requiredEquity = calculatePotOdds(gameState.pot, gameState.callAmount);
      recommendation = getRecommendation({
        equity: equityPct,
        potOdds: requiredEquity,
        potSize: gameState.pot,
        callAmount: gameState.callAmount,
        stage: gameState.stage,
        position: gameState.position,
        holeCards: gameState.holeCards,
        boardCards: [],
        spr: gameState.getSPR(),
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
        potOdds: null, // no bet to call → don't show pot odds
      };
    }
  } else {
    // Post-flop
    const simResult = await calculateEquity(
      [gameState.holeCards],
      [],
      gameState.boardCards,
      { iterations: 5000, shortDeck: gameState.isShortDeck, numRandomOpponents: numActiveOpponents, opponentRanges: rangePercentages },
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
      holeCards: gameState.holeCards,
      boardCards: gameState.boardCards,
      spr: gameState.getSPR(),
    });

    equityData = {
      equity: simResult.equities[0],
      handType: handType || null,
      potOdds: gameState.callAmount > 0 ? requiredEquity / 100 : null,
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
