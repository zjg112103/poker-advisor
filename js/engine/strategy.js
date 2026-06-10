/**
 * Strategy engine for poker recommendations.
 * Converts equity calculations into actionable poker advice based on
 * pot odds, position, stage, and hand strength.
 */
import { calculatePotOdds } from './monte-carlo.js';

/**
 * Get a recommendation for the current hand based on equity vs pot odds.
 *
 * @param {object} params
 * @param {number} params.equity - Win rate percentage (0-100)
 * @param {number} params.potOdds - Required equity to call (0-100)
 * @param {number} params.potSize - Current pot size
 * @param {number} params.callAmount - Amount needed to call (0 = free check)
 * @param {string} params.stage - 'preflop'|'flop'|'turn'|'river'
 * @param {string} params.position - Player position
 * @param {boolean} params.isShortDeck - Whether short deck variant
 * @param {number} params.numPlayers - Number of players in hand
 * @returns {{ action: string, raiseAmount?: number, betAmount?: number, confidence: string, reason: string }}
 */
export function getRecommendation({
  equity,
  potOdds,
  potSize,
  callAmount,
  stage,
  position,
  isShortDeck,
  numPlayers,
}) {
  // Free check situation - no cost to continue
  if (callAmount === 0) {
    if (equity > 60) {
      const betAmount = Math.round(potSize * 0.5);
      return {
        action: 'BET',
        betAmount,
        confidence: 'HIGH',
        reason: `胜率${equity}%较高，建议下注${betAmount}以获取价值`,
      };
    }
    return {
      action: 'CHECK',
      confidence: 'MEDIUM',
      reason: `胜率${equity}%，免费过牌，等待更好机会`,
    };
  }

  const edge = equity - potOdds;

  // Strong hand: equity much higher than pot odds with big edge
  if (edge > 20 && equity > 65) {
    const raiseAmount = Math.round(
      Math.max(potSize * 0.75, callAmount * 2.5)
    );
    return {
      action: 'RAISE',
      raiseAmount,
      confidence: 'HIGH',
      reason: `胜率${equity}%远高于底池赔率${potOdds}%，优势明显，建议加注至${raiseAmount}获取最大价值`,
    };
  }

  // Clear positive edge: call with high confidence
  if (edge > 10) {
    return {
      action: 'CALL',
      confidence: 'HIGH',
      reason: `胜率${equity}%高于底池赔率${potOdds}%，有${edge.toFixed(1)}%的优势，值得跟注`,
    };
  }

  // Small positive edge: call with medium confidence
  if (edge > 0) {
    return {
      action: 'CALL',
      confidence: 'MEDIUM',
      reason: `胜率${equity}%略高于底池赔率${potOdds}%，边际跟注`,
    };
  }

  // Speculative call: slightly below pot odds but not on river
  if (edge > -8 && stage !== 'river') {
    return {
      action: 'CALL',
      confidence: 'LOW',
      reason: `胜率${equity}%略低于底池赔率${potOdds}%，但还有${stage === 'preflop' ? '翻牌' : stage === 'flop' ? '转牌' : '河牌'}可期，投机跟注`,
    };
  }

  // Fold
  return {
    action: 'FOLD',
    confidence: 'LOW',
    reason: `胜率${equity}%低于底池赔率${potOdds}%，差距${Math.abs(edge).toFixed(1)}%，建议弃牌`,
  };
}

/**
 * Get preflop recommendation based on starting hand strength.
 *
 * @param {object} params
 * @param {Array<{rank: string, suit: string, value: number}>} params.holeCards - Two hole cards
 * @param {string} params.position - Player position
 * @param {number} params.numPlayers - Number of players at table
 * @param {boolean} params.isShortDeck - Whether short deck variant
 * @param {Array} params.actions - Previous actions in the hand
 * @returns {{ action: string, confidence: string, reason: string }}
 */
export function getPreflopRecommendation({
  holeCards,
  position,
  numPlayers,
  isShortDeck,
  actions,
}) {
  const strength = evaluateStartingHand(holeCards, isShortDeck);
  const positionBonus = getPositionBonus(position);
  const actionAdjustment = getActionAdjustment(actions);

  const adjustedStrength = Math.max(0, Math.min(100,
    strength + positionBonus + actionAdjustment
  ));

  let action, confidence, reason;

  if (adjustedStrength > 70) {
    action = 'RAISE';
    confidence = adjustedStrength > 85 ? 'HIGH' : 'MEDIUM';
    reason = `起手牌强度${adjustedStrength.toFixed(0)}（基础${strength.toFixed(0)}+位置${positionBonus > 0 ? '+' : ''}${positionBonus}+动作调整${actionAdjustment > 0 ? '+' : ''}${actionAdjustment}），建议加注`;
  } else if (adjustedStrength > 45) {
    action = 'CALL';
    confidence = adjustedStrength > 60 ? 'MEDIUM' : 'LOW';
    reason = `起手牌强度${adjustedStrength.toFixed(0)}（基础${strength.toFixed(0)}+位置${positionBonus > 0 ? '+' : ''}${positionBonus}+动作调整${actionAdjustment > 0 ? '+' : ''}${actionAdjustment}），可以跟注`;
  } else {
    action = 'FOLD';
    confidence = 'LOW';
    reason = `起手牌强度${adjustedStrength.toFixed(0)}（基础${strength.toFixed(0)}+位置${positionBonus > 0 ? '+' : ''}${positionBonus > 0 ? '+' : ''}${actionAdjustment}），建议弃牌`;
  }

  return { action, confidence, reason };
}

/**
 * Evaluate starting hand strength (0-100).
 */
function evaluateStartingHand(holeCards, isShortDeck) {
  const [card1, card2] = holeCards;
  const highValue = Math.max(card1.value, card2.value);
  const lowValue = Math.min(card1.value, card2.value);
  const isPair = card1.rank === card2.rank;
  const isSuited = card1.suit === card2.suit;
  const gap = highValue - lowValue;
  const isConnected = gap <= 2 && !isPair;
  const isBroadway = highValue >= 10 && lowValue >= 10;

  let strength;

  if (isPair) {
    // Pair: 50 + rank_value * 3 (AA=92, KK=89, ..., 22=56)
    strength = 50 + card1.value * 3;
    // Short deck: small pairs penalty
    if (isShortDeck && card1.value <= 6) {
      strength -= 10;
    }
  } else {
    // Non-pair: (highCard + lowCard) * 1.5 + bonuses
    strength = (highValue + lowValue) * 1.5;
    if (isSuited) strength += 8;
    if (isConnected) strength += 6;
    if (isBroadway) strength += 10;
    // Short deck: connected cards bonus
    if (isShortDeck && isConnected) {
      strength += 5;
    }
  }

  return Math.max(0, Math.min(100, strength));
}

/**
 * Get position bonus for preflop hand strength.
 */
function getPositionBonus(position) {
  const bonuses = {
    BTN: 12,
    CO: 8,
    MP: 4,
    UTG: -2,
    SB: 2,
    BB: 6,
  };
  return bonuses[position] || 0;
}

/**
 * Get action adjustment based on previous actions in the hand.
 */
function getActionAdjustment(actions) {
  if (!actions || actions.length === 0) {
    return 5; // All folded, better situation
  }

  const hasRaise = actions.some(
    (a) => a.action === 'raise' || a.action === 'RAISE'
  );
  if (hasRaise) {
    return -15;
  }

  return 0;
}
