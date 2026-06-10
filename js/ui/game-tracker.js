/**
 * Game State Tracker for poker game flow management.
 * Tracks stages, positions, pot, and player actions.
 */

export const STAGES = ['setup', 'preflop', 'flop', 'turn', 'river', 'showdown'];

export const POSITIONS_9 = ['SB', 'BB', 'UTG', 'UTG1', 'MP', 'MP1', 'HJ', 'CO', 'BTN'];
export const POSITIONS_6 = ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN'];
export const POSITIONS_4 = ['SB', 'BB', 'SB2', 'BTN'];
export const POSITIONS_2 = ['SB', 'BB'];

const POSITIONS_MAP = {
  9: POSITIONS_9,
  6: POSITIONS_6,
  4: POSITIONS_4,
  2: POSITIONS_2,
};

export class GameState {
  /**
   * @param {{ numPlayers: number, position: string, isShortDeck?: boolean }} config
   */
  constructor({ numPlayers, position, isShortDeck = false }) {
    this.numPlayers = numPlayers;
    this.position = position;
    this.isShortDeck = isShortDeck;

    this.stage = 'setup';
    this.holeCards = [];
    this.boardCards = [];
    this.pot = 0;
    this.callAmount = 0;
    this.actions = [];
    this.hasAllIn = false;
  }

  /** Reset to setup stage, clear all state. Config is preserved. */
  reset() {
    this.stage = 'setup';
    this.holeCards = [];
    this.boardCards = [];
    this.pot = 0;
    this.callAmount = 0;
    this.actions = [];
    this.hasAllIn = false;
  }

  /**
   * Update configuration.
   * @param {{ numPlayers?: number, position?: string, isShortDeck?: boolean }} config
   */
  setConfig({ numPlayers, position, isShortDeck }) {
    if (numPlayers !== undefined) this.numPlayers = numPlayers;
    if (position !== undefined) this.position = position;
    if (isShortDeck !== undefined) this.isShortDeck = isShortDeck;
  }

  /**
   * Set hole cards and advance to preflop.
   * @param {Array<{rank: string, suit: string, value: number}>} cards
   */
  setHoleCards(cards) {
    this.holeCards = cards;
    this.stage = 'preflop';
  }

  /**
   * Advance to next stage and add board cards.
   * @param {Array<{rank: string, suit: string, value: number}>} newBoardCards
   */
  advanceStage(newBoardCards) {
    const currentIndex = STAGES.indexOf(this.stage);
    if (currentIndex < STAGES.length - 1) {
      this.stage = STAGES[currentIndex + 1];
    }
    this.boardCards = [...this.boardCards, ...newBoardCards];
  }

  /**
   * Track an action and update pot / callAmount.
   * @param {{ type: string, amount?: number, player?: string }} action
   */
  addAction({ type, amount, player }) {
    const action = { type, player };

    switch (type) {
      case 'fold':
        // No pot change
        break;

      case 'call':
        this.pot += this.callAmount;
        action.amount = this.callAmount;
        break;

      case 'raise':
        // Player puts in (raiseAmount - their current obligation) extra
        const raiseExtra = amount - this.callAmount;
        this.pot += raiseExtra;
        this.callAmount = amount;
        action.amount = amount;
        break;

      case 'bet':
        this.pot += amount;
        this.callAmount = amount;
        action.amount = amount;
        break;

      case 'allin':
        this.pot += amount;
        this.callAmount = amount;
        this.hasAllIn = true;
        action.amount = amount;
        break;
    }

    this.actions.push(action);
  }

  /** @returns {number} Current call amount */
  getCallAmount() {
    return this.callAmount;
  }

  /** @returns {string[]} Position array based on numPlayers */
  getPositions() {
    return POSITIONS_MAP[this.numPlayers] || POSITIONS_6;
  }

  /** @returns {Object} Serialized state */
  toJSON() {
    return {
      stage: this.stage,
      numPlayers: this.numPlayers,
      position: this.position,
      isShortDeck: this.isShortDeck,
      holeCards: this.holeCards,
      boardCards: this.boardCards,
      pot: this.pot,
      callAmount: this.callAmount,
      actions: this.actions,
      hasAllIn: this.hasAllIn,
    };
  }
}
