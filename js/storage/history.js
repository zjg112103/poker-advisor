/**
 * Hand History Storage Module.
 * Persists hand records to localStorage for review and statistics.
 */

export const STORAGE_KEY = 'poker_advisor_history';

const MAX_ENTRIES = 200;

export class HandHistory {
  /**
   * Save a hand record to history.
   * Prepends to the array so newest entries come first.
   * Enforces a maximum of 200 entries, dropping the oldest.
   * @param {Object} handRecord - The hand record to save
   */
  saveHand(handRecord) {
    const history = this.getAll();
    history.unshift(handRecord);
    if (history.length > MAX_ENTRIES) {
      history.length = MAX_ENTRIES;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  /**
   * Get all hand records from history.
   * @returns {Array<Object>} Array of hand records, newest first
   */
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all hand history from localStorage.
   */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get statistics about saved hands.
   * @returns {{ total: number, actions: Object<string, number> }}
   */
  getStats() {
    const history = this.getAll();
    const actions = {};

    for (const record of history) {
      const key = (record.action || 'UNKNOWN').toUpperCase();
      actions[key] = (actions[key] || 0) + 1;
    }

    return { total: history.length, actions };
  }
}
