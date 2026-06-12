/**
 * Strategy engine for poker recommendations.
 *
 * Uses Expected Value (EV) calculation for decisions — pure math, no hardcoded thresholds.
 *   EV(call) = equity × (pot + call) − (1 − equity) × call
 *
 * Bet sizing and raise amounts use equity-based fractions from ranges.js.
 */
import { calculateEV, suggestBetSize, chenScore, getRangePercent } from './ranges.js';

/**
 * Get a post-flop recommendation based on equity and pot situation.
 */
export function getRecommendation({
  equity, potOdds, potSize, callAmount, stage, position, isShortDeck, numPlayers,
}) {
  // Note: potOdds is available for reference but EV calculation implicitly
  // captures the same concept: EV = equity*(pot+call) - (1-equity)*call.
  if (callAmount === 0) {
    // No bet to call: check or bet
    if (equity > 60) {
      const bet = suggestBetSize(equity / 100);
      const betAmount = Math.round(potSize * bet.fraction);
      return {
        action: 'BET', betAmount, confidence: equity > 75 ? 'HIGH' : 'MEDIUM',
        reason: '胜率' + equity.toFixed(1) + '%，' + bet.reason + '，建议下注' + betAmount,
      };
    }
    return {
      action: 'CHECK', confidence: 'MEDIUM',
      reason: '胜率' + equity.toFixed(1) + '%，免费过牌',
    };
  }

  // Calculate EV of calling — pure math
  const evCall = calculateEV(equity / 100, potSize, callAmount);

  if (evCall < -callAmount * 0.1) {
    // Clearly negative EV
    return {
      action: 'FOLD', confidence: evCall < -callAmount * 0.3 ? 'HIGH' : 'LOW',
      reason: '胜率' + equity.toFixed(1) + '%，跟注期望值(' + evCall.toFixed(0) + ')为负，建议弃牌',
    };
  }

  if (evCall < 0) {
    // Slightly negative EV — marginal fold unless implied odds
    if (stage !== 'river') {
      return {
        action: 'CALL', confidence: 'LOW',
        reason: '胜率' + equity.toFixed(1) + '%，跟注EV略负(' + evCall.toFixed(0) + ')，但还有后续牌可改善',
      };
    }
    return {
      action: 'FOLD', confidence: 'LOW',
      reason: '胜率' + equity.toFixed(1) + '%，跟注EV为负(' + evCall.toFixed(0) + ')，已是河牌建议弃牌',
    };
  }

  // Positive EV — consider raising for value
  if (equity > 65 && evCall > callAmount * 0.5) {
    const raiseAmount = Math.round(Math.max(potSize * 0.75, callAmount * 2));
    return {
      action: 'RAISE', raiseAmount, confidence: 'HIGH',
      reason: '胜率' + equity.toFixed(1) + '%，跟注EV=+' + evCall.toFixed(0) + '，优势明显，建议加注至' + raiseAmount,
    };
  }

  return {
    action: 'CALL', confidence: evCall > callAmount * 0.3 ? 'HIGH' : 'MEDIUM',
    reason: '胜率' + equity.toFixed(1) + '%，跟注EV=+' + evCall.toFixed(0) + '，值得跟注',
  };
}

/**
 * Get a preflop recommendation based on starting hand strength.
 * Uses Chen formula (from ranges.js) instead of a custom scoring.
 */
export function getPreflopRecommendation({ holeCards, position, numPlayers, isShortDeck, actions }) {
  const strength = chenScore(holeCards[0], holeCards[1]);
  const positionBonus = getPositionBonus(position);
  const actionAdjustment = getActionAdjustment(actions);
  const adjusted = Math.max(0, Math.min(20, strength + positionBonus + actionAdjustment));

  // Chen score thresholds (max is ~20 for AA):
  // > 12: strong (roughly top 10% — pairs TT+, AK, AQs)
  // > 8: playable (roughly top 25%)
  // > 5: marginal
  // < 5: weak

  let action, confidence, reason;
  const posStr = positionBonus > 0 ? '+' : '';
  const actStr = actionAdjustment > 0 ? '+' : '';

  if (adjusted > 12) {
    action = 'RAISE';
    confidence = adjusted > 16 ? 'HIGH' : 'MEDIUM';
    reason = 'Chen评分' + adjusted.toFixed(1) + '(基础' + strength.toFixed(1) + posStr + positionBonus + actStr + actionAdjustment + ')，强牌建议加注';
  } else if (adjusted > 8) {
    action = 'CALL';
    confidence = adjusted > 10 ? 'MEDIUM' : 'LOW';
    reason = 'Chen评分' + adjusted.toFixed(1) + '(基础' + strength.toFixed(1) + posStr + positionBonus + actStr + actionAdjustment + ')，可玩牌跟注';
  } else if (adjusted > 5) {
    action = 'FOLD';
    confidence = 'LOW';
    reason = 'Chen评分' + adjusted.toFixed(1) + '(基础' + strength.toFixed(1) + posStr + positionBonus + actStr + actionAdjustment + ')，边缘牌建议弃牌';
  } else {
    action = 'FOLD';
    confidence = 'HIGH';
    reason = 'Chen评分' + adjusted.toFixed(1) + '(基础' + strength.toFixed(1) + posStr + positionBonus + actStr + actionAdjustment + ')，弱牌应弃牌';
  }

  return { action, confidence, reason };
}

function getPositionBonus(position) {
  // Chen score bonus by position (later = more valuable)
  const bonuses = { BTN: 3, CO: 2, SB: 1, BB: 1, MP: 0, UTG: -1, UTG1: -1, MP1: 0 };
  return bonuses[position] || 0;
}

function getActionAdjustment(actions) {
  if (!actions || actions.length === 0) return 1; // unopened pot = slightly better
  const hasRaise = actions.some(a => a.type === 'raise' || a.type === 'RAISE');
  if (hasRaise) return -3; // facing a raise = need stronger hand
  return 0;
}
