/**
 * Game State Tracker for poker game flow management.
 * Tracks stages, positions, pot, per-seat actions, and action order.
 */
import { inferOpponentRange } from '../engine/ranges.js';

export const STAGES = ['setup', 'preflop', 'flop', 'turn', 'river', 'showdown'];

export const POSITIONS_9 = ['UTG', 'UTG1', 'MP', 'MP1', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const POSITIONS_6 = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
export const POSITIONS_4 = ['BTN', 'SB', 'BB', 'UTG'];
export const POSITIONS_2 = ['SB', 'BB'];

// Positions in clockwise order, matching setup-screen POSITION_SETS
const POSITIONS_BY_COUNT = {
  '2': POSITIONS_2,
  '3': ['BTN', 'SB', 'BB'],
  '4': POSITIONS_4,
  '5': ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  '6': POSITIONS_6,
  '7': ['UTG', 'UTG1', 'MP', 'MP1', 'CO', 'BTN', 'SB', 'BB'],
  '8': ['UTG', 'UTG1', 'MP', 'MP1', 'CO', 'BTN', 'SB', 'BB'],
  '9': ['UTG', 'UTG1', 'MP', 'MP1', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

// Map numPlayers to position sets (used by getPositions).
// Covers every count 2-9; falls back to POSITIONS_6 for unexpected values.
const POSITIONS_MAP = {};
for (let n = 2; n <= 9; n++) {
  POSITIONS_MAP[n] = POSITIONS_BY_COUNT[String(n)] || POSITIONS_6;
}

export class GameState {
  constructor({ numPlayers, position, isShortDeck = false, bigBlind = 10 }) {
    this.numPlayers = numPlayers;
    this.heroPosition = position;
    this.position = position;
    this.isShortDeck = isShortDeck;
    this.bigBlind = bigBlind;
    this.stage = 'setup';
    this.holeCards = [];
    this.boardCards = [];
    this.pot = 0;
    this.callAmount = 0;
    this.actions = [];
    this.hasAllIn = false;

    this.seats = this._initSeats();
  }

  _initSeats() {
    const positions = POSITIONS_BY_COUNT[String(this.numPlayers)] || POSITIONS_6;
    return positions.map(pos => ({
      position: pos,
      isHero: pos === this.heroPosition,
      status: 'active',
      roundActions: [],
      roundInvestment: 0,
    }));
  }

  reset() {
    this.stage = 'setup';
    this.holeCards = [];
    this.boardCards = [];
    this.pot = 0;
    this.callAmount = 0;
    this.actions = [];
    this.hasAllIn = false;
    this.seats = this._initSeats();
  }

  setConfig({ numPlayers, position, isShortDeck }) {
    if (numPlayers !== undefined) this.numPlayers = numPlayers;
    if (position !== undefined) {
      this.position = position;
      this.heroPosition = position;
    }
    if (isShortDeck !== undefined) this.isShortDeck = isShortDeck;
    this.seats = this._initSeats();
  }

  setHoleCards(cards) {
    this.holeCards = cards;
    this.stage = 'preflop';
    this.postBlinds();
  }

  postBlinds() {
    const bb = this.bigBlind;
    const sbAmount = bb;
    const sbSeat = this.seats.find(s => s.position === 'SB');
    const bbSeat = this.seats.find(s => s.position === 'BB');

    if (sbSeat) {
      this.pot += sbAmount;
      sbSeat.roundInvestment = sbAmount;
      sbSeat.roundActions.push({ type: 'blind', amount: sbAmount, position: 'SB' });
    }
    if (bbSeat) {
      this.pot += bb;
      bbSeat.roundInvestment = bb;
      bbSeat.roundActions.push({ type: 'blind', amount: bb, position: 'BB' });
    }
    this.callAmount = bb;
  }

  advanceStage(newBoardCards) {
    const currentIndex = STAGES.indexOf(this.stage);
    if (currentIndex < STAGES.length - 1) {
      this.stage = STAGES[currentIndex + 1];
    }
    this.boardCards = [...this.boardCards, ...newBoardCards];
    this.callAmount = 0;
    for (const seat of this.seats) {
      seat.roundActions = [];
      seat.roundInvestment = 0;
    }
  }

  addAction({ type, amount, player, position }) {
    const pos = position || player;
    const action = { type, position: pos };
    const seat = this.seats.find(s => s.position === pos);

    switch (type) {
      case 'fold':
        if (seat) seat.status = 'folded';
        break;
      case 'check':
        break;
      case 'call': {
        const invested = seat ? seat.roundInvestment : 0;
        const toAdd = Math.max(0, this.callAmount - invested);
        this.pot += toAdd;
        if (seat) seat.roundInvestment += toAdd;
        action.amount = toAdd;
        break;
      }
      case 'raise': {
        const invested = seat ? seat.roundInvestment : 0;
        const toAdd = Math.max(0, amount - invested);
        this.pot += toAdd;
        this.callAmount = amount;
        if (seat) seat.roundInvestment = amount;
        action.amount = amount;
        break;
      }
      case 'bet':
        this.pot += amount;
        this.callAmount = amount;
        if (seat) seat.roundInvestment = amount;
        action.amount = amount;
        break;
      case 'allin': {
        const invested = seat ? seat.roundInvestment : 0;
        const toAdd = Math.max(0, amount - invested);
        this.pot += toAdd;
        this.callAmount = Math.max(this.callAmount, amount);
        this.hasAllIn = true;
        action.amount = amount;
        if (seat) {
          seat.roundInvestment = amount;
          seat.status = 'allin';
        }
        break;
      }
    }

    this.actions.push(action);
    if (seat) {
      seat.roundActions.push(action);
    }
  }

  getActionOrder() {
    const positions = POSITIONS_BY_COUNT[String(this.numPlayers)] || POSITIONS_6;
    let startIndex;

    if (this.stage === 'preflop') {
      const bbIdx = positions.indexOf('BB');
      startIndex = (bbIdx + 1) % positions.length;
    } else {
      const btnIdx = positions.indexOf('BTN');
      startIndex = (btnIdx + 1) % positions.length;
    }

    const order = [];
    for (let i = 0; i < positions.length; i++) {
      order.push(positions[(startIndex + i) % positions.length]);
    }
    return order;
  }

  getActiveOpponents() {
    return this.seats.filter(s => !s.isHero && s.status !== 'folded');
  }

  getOpponentRanges() {
    const opponents = this.getActiveOpponents();
    return opponents.map(seat => {
      const lastAction = seat.roundActions.length > 0
        ? seat.roundActions[seat.roundActions.length - 1]
        : null;
      const actionType = lastAction ? lastAction.type : 'call';
      const rangePercent = inferOpponentRange(seat.position, actionType);
      return { position: seat.position, rangePercent };
    });
  }

  getCallAmount() {
    return this.callAmount;
  }

  /**
   * Get the amount hero still needs to put in to call.
   * Accounts for what hero has already invested this round.
   */
  getHeroCallAmount() {
    const heroSeat = this.seats.find(s => s.isHero);
    if (!heroSeat) return this.callAmount;
    return Math.max(0, this.callAmount - heroSeat.roundInvestment);
  }

  getPositions() {
    return POSITIONS_MAP[this.numPlayers] || POSITIONS_6;
  }

  toJSON() {
    return {
      stage: this.stage,
      numPlayers: this.numPlayers,
      position: this.heroPosition,
      isShortDeck: this.isShortDeck,
      holeCards: this.holeCards,
      boardCards: this.boardCards,
      pot: this.pot,
      callAmount: this.callAmount,
      actions: this.actions,
      hasAllIn: this.hasAllIn,
      seats: this.seats,
    };
  }
}
