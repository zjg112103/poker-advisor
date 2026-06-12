/**
 * Short Deck Poker (6+ Hold'em) — Strategy Engine.
 *
 * All logic optimized for 36-card short deck where flush > full house.
 * Uses EV calculation, board texture analysis, draw detection,
 * SPR-aware decisions, and position-based equity realization.
 */
import {
  calculateEV, suggestBetSize, shortDeckHandScore,
  isInOpenRange, isInCallRange, isIn3BetRange,
} from './ranges.js';
import { analyzeBoard } from './board-analysis.js';

// ---------------------------------------------------------------------------
// Equity Realization by position
// ---------------------------------------------------------------------------

const EQ_REALIZATION = {
  BTN: 1.08, CO: 1.05, HJ: 1.02,
  MP1: 1.01, MP: 1.00, UTG1: 0.96, UTG: 0.95,
  SB: 0.93, BB: 0.95,
};

function realizeEquity(rawEquity, position) {
  const mult = EQ_REALIZATION[(position || '').toUpperCase()] || 1.0;
  return Math.min(1, Math.max(0, rawEquity * mult));
}

// ---------------------------------------------------------------------------
// Post-flop recommendation
// ---------------------------------------------------------------------------

/**
 * Get a post-flop recommendation for short deck.
 * @param {number} spr - Stack-to-Pot Ratio (heroStack / potSize)
 */
export function getRecommendation({
  equity, potOdds, potSize, callAmount, stage, position,
  isShortDeck, numPlayers,    // kept for signature compat, ignored
  holeCards, boardCards,
  spr,                        // Stack-to-Pot Ratio
}) {
  const board = boardCards || [];
  const analysis = analyzeBoard(board, holeCards);

  // Apply equity realization (position-based adjustment)
  const rawEq = equity / 100;
  const eq01 = realizeEquity(rawEq, position);
  const realizedPct = eq01 * 100;

  // SPR defaults to infinity if not provided (deep stack)
  const sprVal = spr != null ? spr : Infinity;

  // --- SPR-based short stack mode ---
  if (sprVal < 4 && callAmount > 0) {
    return shortStackDecision(realizedPct, eq01, potSize, callAmount, analysis);
  }

  // --- No bet to call: check or bet ---
  if (callAmount === 0) {
    return noBetDecision(realizedPct, eq01, potSize, stage, analysis, sprVal);
  }

  // --- EV of calling ---
  const evCall = calculateEV(eq01, potSize, callAmount);

  // --- Draw bonus: strong draws boost effective equity ---
  const drawBonus = analysis.totalOuts >= 12 ? 0.08
                  : analysis.totalOuts >= 8  ? 0.05
                  : analysis.totalOuts >= 4  ? 0.02 : 0;
  const eqAdj = Math.min(1, eq01 + drawBonus);
  const evAdj = calculateEV(eqAdj, potSize, callAmount);

  // --- Strong hand: value raise ---
  if (realizedPct > 70 && evCall > 0) {
    const amt = valueRaiseSize(realizedPct, potSize, callAmount, analysis, sprVal);
    return {
      action: 'RAISE', raiseAmount: amt,
      confidence: realizedPct > 80 ? 'HIGH' : 'MEDIUM',
      reason: reason(realizedPct, evCall, 'value_raise', analysis),
    };
  }

  // --- Strong draw semi-bluff ---
  if (analysis.totalOuts >= 12 && realizedPct > 40 && callAmount <= potSize * 0.5) {
    return {
      action: 'RAISE', raiseAmount: Math.round(potSize * 0.5),
      confidence: 'MEDIUM',
      reason: reason(realizedPct, evCall, 'semibluff', analysis),
    };
  }

  // --- Clearly positive EV → call ---
  if (evAdj > callAmount * 0.2) {
    return {
      action: 'CALL',
      confidence: evAdj > callAmount * 0.5 ? 'HIGH' : 'MEDIUM',
      reason: reason(realizedPct, evCall, 'call', analysis),
    };
  }

  // --- Marginal with draws or not river → call ---
  if (evAdj >= -callAmount * 0.1 && stage !== 'river') {
    return {
      action: 'CALL', confidence: 'LOW',
      reason: reason(realizedPct, evCall, analysis.totalOuts >= 8 ? 'draw_call' : 'marginal_call', analysis),
    };
  }

  // --- Negative EV → fold ---
  return {
    action: 'FOLD',
    confidence: evCall < -callAmount * 0.3 ? 'HIGH' : 'MEDIUM',
    reason: reason(realizedPct, evCall, 'fold', analysis),
  };
}

// ---------------------------------------------------------------------------
// Short-stack mode (SPR < 4)
// ---------------------------------------------------------------------------

function shortStackDecision(equity, eq01, potSize, callAmount, analysis) {
  // SPR < 4: very committed, simplify to shove-or-fold
  if (equity > 55) {
    return {
      action: 'RAISE', raiseAmount: potSize + callAmount,
      confidence: equity > 65 ? 'HIGH' : 'MEDIUM',
      reason: '胜率' + equity.toFixed(1) + '%，SPR<4短筹全押',
    };
  }
  if (equity > 45) {
    const evCall = calculateEV(eq01, potSize, callAmount);
    if (evCall >= 0) {
      return {
        action: 'CALL', confidence: 'MEDIUM',
        reason: '胜率' + equity.toFixed(1) + '%，SPR<4短筹跟注(EV=' + evCall.toFixed(0) + ')',
      };
    }
    return {
      action: 'FOLD', confidence: 'LOW',
      reason: '胜率' + equity.toFixed(1) + '%，SPR<4短筹弃牌(EV=' + evCall.toFixed(0) + ')',
    };
  }
  return {
    action: 'FOLD', confidence: 'HIGH',
    reason: '胜率' + equity.toFixed(1) + '%，SPR<4短筹弃牌',
  };
}

// ---------------------------------------------------------------------------
// No-bet decision (check or bet)
// ---------------------------------------------------------------------------

function noBetDecision(equity, eq01, potSize, stage, analysis, sprVal) {
  // SPR < 4: commit with strong hand
  if (sprVal < 4 && equity > 55) {
    return {
      action: 'BET', betAmount: potSize,
      confidence: equity > 65 ? 'HIGH' : 'MEDIUM',
      reason: '胜率' + equity.toFixed(1) + '%，SPR<4短筹全押',
    };
  }

  // Strong hand → value bet
  if (equity > 65) {
    const bet = suggestBetSize(eq01);
    let fraction = bet.fraction;
    // Wet board: bet bigger for protection
    if (analysis.texture === 'wet' && equity < 80) fraction = Math.min(0.75, fraction + 0.15);
    const amt = Math.round(potSize * fraction);
    return {
      action: 'BET', betAmount: amt,
      confidence: equity > 80 ? 'HIGH' : 'MEDIUM',
      reason: '胜率' + equity.toFixed(1) + '%，' + bet.reason + '，建议下注' + amt,
    };
  }

  // Strong draw on wet board → semi-bluff bet
  if (analysis.totalOuts >= 10 && equity > 40) {
    const amt = Math.round(potSize * 0.4);
    return {
      action: 'BET', betAmount: amt, confidence: 'LOW',
      reason: '胜率' + equity.toFixed(1) + '%，' + analysis.totalOuts + ' outs强听牌，半诈唬下注' + amt,
    };
  }

  return { action: 'CHECK', confidence: 'MEDIUM', reason: '胜率' + equity.toFixed(1) + '%，过牌' };
}

// ---------------------------------------------------------------------------
// Bet sizing helpers
// ---------------------------------------------------------------------------

function valueRaiseSize(equity, potSize, callAmount, analysis, sprVal) {
  // SPR 4-10: smaller raises to avoid over-committing
  if (sprVal < 10) {
    return Math.round(Math.max(potSize * 0.4, callAmount * 2));
  }

  let base;
  if (equity > 85)     base = Math.max(potSize * 0.75, callAmount * 2.5);
  else if (equity > 75) base = Math.max(potSize * 0.6,  callAmount * 2);
  else                  base = Math.max(potSize * 0.5,  callAmount * 2);
  // Wet board: bigger for protection
  if (analysis.texture === 'wet') base = Math.max(base, potSize * 0.75);
  return Math.round(base);
}

// ---------------------------------------------------------------------------
// Reason builder
// ---------------------------------------------------------------------------

function reason(equity, evCall, type, analysis) {
  const eq = equity.toFixed(1);
  const ev = evCall.toFixed(0);
  const outs = analysis.totalOuts > 0 ? '，' + analysis.totalOuts + ' outs' : '';

  switch (type) {
    case 'value_raise':  return '胜率' + eq + '%，EV=+' + ev + outs + '，价值加注';
    case 'semibluff':    return '胜率' + eq + '%，' + analysis.totalOuts + ' outs强听牌，半诈唬加注';
    case 'call':         return '胜率' + eq + '%，EV=+' + ev + outs + '，值得跟注';
    case 'draw_call':    return '胜率' + eq + '%，EV略负(' + ev + ')，但有' + analysis.totalOuts + ' outs可改善';
    case 'marginal_call': return '胜率' + eq + '%，EV≈0(' + ev + ')' + outs + '，边缘跟注';
    case 'fold':         return '胜率' + eq + '%，EV=' + ev + outs + '，建议弃牌';
    default:             return '胜率' + eq + '%';
  }
}

// ---------------------------------------------------------------------------
// Preflop recommendation
// ---------------------------------------------------------------------------

/**
 * Get a preflop recommendation using short-deck position range tables.
 */
export function getPreflopRecommendation({ holeCards, position, numPlayers, actions }) {
  const score = shortDeckHandScore(holeCards[0], holeCards[1]);
  const pos = (position || '').toUpperCase();

  // Detect action context
  const hasRaise = actions && actions.length > 0 &&
    actions.some(a => a.type === 'raise' || a.type === 'RAISE' || a.type === 'bet' || a.type === 'BET');
  const hasAllIn = actions && actions.some(a => a.type === 'allin' || a.type === 'ALLIN');

  let action, confidence, reasonStr;

  if (hasAllIn) {
    // Facing all-in: need premium hand
    if (score >= 85) {
      action = 'CALL'; confidence = 'HIGH';
      reasonStr = '评分' + score.toFixed(0) + '，面对All-In跟注';
    } else if (score >= 72) {
      action = 'CALL'; confidence = 'MEDIUM';
      reasonStr = '评分' + score.toFixed(0) + '，边缘All-In跟注';
    } else {
      action = 'FOLD'; confidence = 'HIGH';
      reasonStr = '评分' + score.toFixed(0) + '，面对All-In弃牌';
    }
  } else if (hasRaise) {
    // Facing a raise: 3-bet / call / fold
    if (isIn3BetRange(holeCards[0], holeCards[1], pos)) {
      action = 'RAISE'; confidence = score >= 85 ? 'HIGH' : 'MEDIUM';
      reasonStr = '评分' + score.toFixed(0) + '，面对加注3-bet';
    } else if (isInCallRange(holeCards[0], holeCards[1], pos)) {
      action = 'CALL'; confidence = score >= 70 ? 'MEDIUM' : 'LOW';
      reasonStr = '评分' + score.toFixed(0) + '，面对加注跟注';
    } else {
      action = 'FOLD'; confidence = 'MEDIUM';
      reasonStr = '评分' + score.toFixed(0) + '，面对加注弃牌';
    }
  } else {
    // Unopened pot: open raise or fold
    if (isInOpenRange(holeCards[0], holeCards[1], pos)) {
      action = 'RAISE'; confidence = score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';
      reasonStr = '评分' + score.toFixed(0) + '，' + pos + '位open加注';
    } else {
      action = 'FOLD'; confidence = score >= 40 ? 'LOW' : 'HIGH';
      reasonStr = '评分' + score.toFixed(0) + '，' + pos + '位弃牌';
    }
  }

  return { action, confidence, reason: reasonStr };
}
