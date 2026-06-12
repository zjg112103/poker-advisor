import { describe, it, expect } from 'vitest';
import { STAGES, POSITIONS_9, POSITIONS_6, POSITIONS_4, POSITIONS_2, GameState } from '../../js/ui/game-tracker.js';

describe('Game State Tracker', () => {
  describe('Constants', () => {
    it('STAGES has correct stage order', () => {
      expect(STAGES).toEqual(['setup', 'preflop', 'flop', 'turn', 'river', 'showdown']);
    });

    it('POSITIONS arrays have correct lengths', () => {
      expect(POSITIONS_9).toHaveLength(9);
      expect(POSITIONS_6).toHaveLength(6);
      expect(POSITIONS_4).toHaveLength(4);
      expect(POSITIONS_2).toHaveLength(2);
    });
  });

  describe('GameState initialization', () => {
    it('initializes with correct defaults', () => {
      const gs = new GameState({ numPlayers: 6, position: 'UTG', isShortDeck: false });
      expect(gs.stage).toBe('setup');
      expect(gs.numPlayers).toBe(6);
      expect(gs.position).toBe('UTG');
      expect(gs.isShortDeck).toBe(false);
      expect(gs.holeCards).toEqual([]);
      expect(gs.boardCards).toEqual([]);
      expect(gs.pot).toBe(0);
      expect(gs.callAmount).toBe(0);
      expect(gs.actions).toEqual([]);
      expect(gs.hasAllIn).toBe(false);
    });
  });

  describe('Stage transitions', () => {
    it('transitions from setup to preflop when hole cards are set', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      expect(gs.stage).toBe('preflop');
      expect(gs.holeCards).toHaveLength(2);
    });

    it('transitions preflop to flop with 3 board cards', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      gs.advanceStage([
        { rank: 'Q', suit: 'diamonds', value: 12 },
        { rank: 'J', suit: 'clubs', value: 11 },
        { rank: 'T', suit: 'spades', value: 10 },
      ]);
      expect(gs.stage).toBe('flop');
      expect(gs.boardCards).toHaveLength(3);
    });

    it('transitions flop to turn with 1 board card', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      gs.advanceStage([
        { rank: 'Q', suit: 'diamonds', value: 12 },
        { rank: 'J', suit: 'clubs', value: 11 },
        { rank: 'T', suit: 'spades', value: 10 },
      ]);
      gs.advanceStage([{ rank: '9', suit: 'hearts', value: 9 }]);
      expect(gs.stage).toBe('turn');
      expect(gs.boardCards).toHaveLength(4);
    });

    it('transitions turn to river with 1 board card', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      gs.advanceStage([
        { rank: 'Q', suit: 'diamonds', value: 12 },
        { rank: 'J', suit: 'clubs', value: 11 },
        { rank: 'T', suit: 'spades', value: 10 },
      ]);
      gs.advanceStage([{ rank: '9', suit: 'hearts', value: 9 }]);
      gs.advanceStage([{ rank: '2', suit: 'clubs', value: 2 }]);
      expect(gs.stage).toBe('river');
      expect(gs.boardCards).toHaveLength(5);
    });
  });

  describe('Pot tracking from actions', () => {
    it('tracks pot from fold (no change)', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      // Blinds auto-posted: SB=10, BB=10 → pot=20
      const basePot = 20;
      gs.addAction({ type: 'fold', player: 'UTG' });
      expect(gs.pot).toBe(basePot);
    });

    it('tracks pot from bet action', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      const basePot = 20;
      gs.addAction({ type: 'bet', amount: 10, player: 'MP' });
      expect(gs.pot).toBe(basePot + 10);
      expect(gs.callAmount).toBe(10);
    });

    it('tracks pot from call action', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      const basePot = 20;
      gs.addAction({ type: 'bet', amount: 10, player: 'MP' });
      gs.addAction({ type: 'call', player: 'CO' });
      expect(gs.pot).toBe(basePot + 10 + 10);
    });

    it('tracks pot from raise action', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      const basePot = 20;
      gs.addAction({ type: 'bet', amount: 10, player: 'MP' });
      gs.addAction({ type: 'raise', amount: 30, player: 'CO' });
      // CO raises to 30, roundInvestment was 0, so adds 30 to pot
      expect(gs.pot).toBe(basePot + 10 + 30);
      expect(gs.callAmount).toBe(30);
    });

    it('tracks a full hand with multiple actions', () => {
      const gs = new GameState({ numPlayers: 6, position: 'BTN' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'A', suit: 'hearts', value: 14 }]);
      const basePot = 20; // blinds

      // Preflop: MP bets 10, CO calls, BTN raises to 30, MP calls, CO folds
      gs.addAction({ type: 'bet', amount: 10, player: 'MP' });
      gs.addAction({ type: 'call', player: 'CO' });
      gs.addAction({ type: 'raise', amount: 30, player: 'BTN' });
      gs.addAction({ type: 'call', player: 'MP' });
      gs.addAction({ type: 'fold', player: 'CO' });

      // Pot: basePot
      //   + 10 (MP bet, roundInvestment 0→10)
      //   + 10 (CO call, roundInvestment 0→10, adds 10-0=10)
      //   + 30 (BTN raise, roundInvestment 0→30, adds 30-0=30)
      //   + 20 (MP call, roundInvestment 10→30, adds 30-10=20)
      //   = basePot + 72
      expect(gs.pot).toBe(basePot + 10 + 10 + 30 + 20);
      expect(gs.callAmount).toBe(30);
    });
  });

  describe('All-in tracking', () => {
    it('sets hasAllIn flag on allin action', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      const basePot = 20;
      gs.addAction({ type: 'bet', amount: 10, player: 'MP' });
      gs.addAction({ type: 'allin', amount: 100, player: 'CO' });
      expect(gs.hasAllIn).toBe(true);
      expect(gs.pot).toBe(basePot + 10 + 100);
      expect(gs.callAmount).toBe(100);
    });
  });

  describe('getPositions', () => {
    it('returns POSITIONS_6 for 6 players', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      expect(gs.getPositions()).toEqual(POSITIONS_6);
    });

    it('returns POSITIONS_9 for 9 players', () => {
      const gs = new GameState({ numPlayers: 9, position: 'UTG' });
      expect(gs.getPositions()).toEqual(POSITIONS_9);
    });

    it('returns POSITIONS_4 for 4 players', () => {
      const gs = new GameState({ numPlayers: 4, position: 'BTN' });
      expect(gs.getPositions()).toEqual(POSITIONS_4);
    });

    it('returns POSITIONS_2 for 2 players', () => {
      const gs = new GameState({ numPlayers: 2, position: 'SB' });
      expect(gs.getPositions()).toEqual(POSITIONS_2);
    });
  });

  describe('Reset', () => {
    it('resets all state back to defaults', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      gs.advanceStage([
        { rank: 'Q', suit: 'diamonds', value: 12 },
        { rank: 'J', suit: 'clubs', value: 11 },
        { rank: 'T', suit: 'spades', value: 10 },
      ]);
      gs.addAction({ type: 'bet', amount: 50, player: 'MP' });
      gs.addAction({ type: 'allin', amount: 200, player: 'CO' });

      gs.reset();

      expect(gs.stage).toBe('setup');
      expect(gs.holeCards).toEqual([]);
      expect(gs.boardCards).toEqual([]);
      expect(gs.pot).toBe(0);
      expect(gs.callAmount).toBe(0);
      expect(gs.actions).toEqual([]);
      expect(gs.hasAllIn).toBe(false);
      // Config is preserved
      expect(gs.numPlayers).toBe(6);
      expect(gs.position).toBe('MP');
    });
  });

  describe('setConfig', () => {
    it('updates configuration', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP', isShortDeck: false });
      gs.setConfig({ numPlayers: 9, position: 'UTG', isShortDeck: true });
      expect(gs.numPlayers).toBe(9);
      expect(gs.position).toBe('UTG');
      expect(gs.isShortDeck).toBe(true);
    });
  });

  describe('getCallAmount', () => {
    it('returns current call amount', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      gs.addAction({ type: 'bet', amount: 20, player: 'MP' });
      expect(gs.getCallAmount()).toBe(20);
    });
  });

  describe('toJSON', () => {
    it('serializes game state', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP', isShortDeck: false });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);

      const json = gs.toJSON();
      expect(json.stage).toBe('preflop');
      expect(json.numPlayers).toBe(6);
      expect(json.position).toBe('MP');
      expect(json.holeCards).toHaveLength(2);
      expect(json.pot).toBe(20); // auto-posted blinds (SB=BB=10)
    });
  });

  describe('getPositions for all player counts', () => {
    it('returns correct positions for 5 players', () => {
      const gs = new GameState({ numPlayers: 5, position: 'UTG' });
      const positions = gs.getPositions();
      expect(positions).toContain('UTG');
      expect(positions).toContain('BTN');
      expect(positions).toContain('SB');
      expect(positions).toContain('BB');
      // 5-player uses same 6-position layout as setup-screen POSITION_SETS
      expect(positions).toHaveLength(6);
    });

    it('returns correct positions for 7 players', () => {
      const gs = new GameState({ numPlayers: 7, position: 'UTG' });
      const positions = gs.getPositions();
      expect(positions).toContain('UTG1');
      // 7-player uses same 8-position layout as setup-screen POSITION_SETS
      expect(positions).toHaveLength(8);
    });

    it('returns correct positions for 8 players', () => {
      const gs = new GameState({ numPlayers: 8, position: 'UTG' });
      const positions = gs.getPositions();
      expect(positions).toContain('UTG1');
      expect(positions).toHaveLength(8);
    });
  });

  describe('getHeroCallAmount', () => {
    it('returns callAmount when hero has not invested', () => {
      const gs = new GameState({ numPlayers: 6, position: 'BTN' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      gs.addAction({ type: 'bet', amount: 20, player: 'MP' });
      // BTN (hero) has not invested in this round, callAmount = 20
      expect(gs.getHeroCallAmount()).toBe(20);
    });

    it('returns 0 for BB hero after everyone just calls (BB can check)', () => {
      const gs = new GameState({ numPlayers: 2, position: 'SB' });
      // hero is SB in heads-up; let's test BB instead
      const gs2 = new GameState({ numPlayers: 6, position: 'BB' });
      gs2.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      // BB already posted bigBlind (10), roundInvestment = 10
      // Everyone just calls, callAmount stays at 10
      gs2.addAction({ type: 'call', player: 'UTG' });
      // Hero (BB) has roundInvestment = 10, callAmount = 10 → heroCall = 0
      expect(gs2.getHeroCallAmount()).toBe(0);
    });

    it('returns difference when hero partially matched', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      // MP bets 10 first
      gs.addAction({ type: 'bet', amount: 10, player: 'CO' });
      // Someone raises to 30
      gs.addAction({ type: 'raise', amount: 30, player: 'BTN' });
      // Hero (MP) hasn't acted yet, roundInvestment = 0
      expect(gs.getHeroCallAmount()).toBe(30);
    });
  });

  describe('roundInvestment tracking', () => {
    it('resets roundInvestment when advancing stage', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      gs.addAction({ type: 'bet', amount: 20, player: 'MP' });
      const mpSeat = gs.seats.find(s => s.position === 'MP');
      expect(mpSeat.roundInvestment).toBe(20);

      gs.advanceStage([
        { rank: 'Q', suit: 'diamonds', value: 12 },
        { rank: 'J', suit: 'clubs', value: 11 },
        { rank: 'T', suit: 'spades', value: 10 },
      ]);
      expect(mpSeat.roundInvestment).toBe(0);
    });

    it('call after raise only adds the difference', () => {
      const gs = new GameState({ numPlayers: 6, position: 'MP' });
      gs.setHoleCards([{ rank: 'A', suit: 'spades', value: 14 }, { rank: 'K', suit: 'hearts', value: 13 }]);
      const basePot = 20;

      gs.addAction({ type: 'bet', amount: 10, player: 'MP' });
      gs.addAction({ type: 'call', player: 'CO' });    // CO puts in 10
      gs.addAction({ type: 'raise', amount: 30, player: 'BTN' });  // BTN puts in 30

      // MP calls the raise: already invested 10, needs to add 30-10=20
      const potBefore = gs.pot;
      gs.addAction({ type: 'call', player: 'MP' });
      expect(gs.pot).toBe(potBefore + 20);

      // CO calls the raise: already invested 10, needs to add 30-10=20
      const potBefore2 = gs.pot;
      gs.addAction({ type: 'call', player: 'CO' });
      expect(gs.pot).toBe(potBefore2 + 20);
    });
  });
});
