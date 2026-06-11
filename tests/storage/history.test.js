import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEY, HandHistory } from '../../js/storage/history.js';

describe('HandHistory', () => {
  let history;

  beforeEach(() => {
    localStorage.clear();
    history = new HandHistory();
  });

  describe('saveHand / getAll', () => {
    it('saves and retrieves a hand record', () => {
      const record = { action: 'FOLD', equity: 0.25, timestamp: Date.now() };
      history.saveHand(record);

      const all = history.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].action).toBe('FOLD');
      expect(all[0].equity).toBe(0.25);
    });

    it('prepends new records (newest first)', () => {
      history.saveHand({ action: 'FOLD', ts: 1 });
      history.saveHand({ action: 'CALL', ts: 2 });

      const all = history.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].action).toBe('CALL');
      expect(all[1].action).toBe('FOLD');
    });

    it('saves multiple records correctly', () => {
      for (let i = 0; i < 10; i++) {
        history.saveHand({ action: 'CALL', index: i });
      }
      expect(history.getAll()).toHaveLength(10);
    });
  });

  describe('getAll', () => {
    it('returns empty array when no history', () => {
      expect(history.getAll()).toEqual([]);
    });

    it('returns empty array if localStorage has invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json');
      expect(history.getAll()).toEqual([]);
    });

    it('returns empty array if localStorage has non-array value', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
      expect(history.getAll()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('removes all history from localStorage', () => {
      history.saveHand({ action: 'FOLD' });
      history.saveHand({ action: 'CALL' });
      expect(history.getAll()).toHaveLength(2);

      history.clear();
      expect(history.getAll()).toEqual([]);
    });

    it('does nothing when history is already empty', () => {
      history.clear();
      expect(history.getAll()).toEqual([]);
    });
  });

  describe('max 200 entries', () => {
    it('limits history to 200 entries, dropping oldest', () => {
      for (let i = 0; i < 250; i++) {
        history.saveHand({ action: 'CALL', index: i });
      }

      const all = history.getAll();
      expect(all).toHaveLength(200);
      // Newest entry (index 249) should be first
      expect(all[0].index).toBe(249);
      // Oldest kept entry (index 50) should be last
      expect(all[199].index).toBe(50);
    });
  });

  describe('getStats', () => {
    it('returns zero stats for empty history', () => {
      const stats = history.getStats();
      expect(stats.total).toBe(0);
      expect(stats.actions).toEqual({});
    });

    it('counts actions correctly', () => {
      history.saveHand({ action: 'FOLD' });
      history.saveHand({ action: 'CALL' });
      history.saveHand({ action: 'CALL' });
      history.saveHand({ action: 'RAISE' });

      const stats = history.getStats();
      expect(stats.total).toBe(4);
      expect(stats.actions.FOLD).toBe(1);
      expect(stats.actions.CALL).toBe(2);
      expect(stats.actions.RAISE).toBe(1);
    });

    it('handles missing action field gracefully', () => {
      history.saveHand({ equity: 0.5 });
      const stats = history.getStats();
      expect(stats.total).toBe(1);
      expect(stats.actions.UNKNOWN).toBe(1);
    });
  });
});
