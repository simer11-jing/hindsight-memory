/**
 * TTLManager - Time-to-live management for memory entries
 * Automatically expires old entries based on layer-specific rules
 */

class TTLManager {
  constructor(options = {}) {
    // Default TTL in days per layer
    this.ttlRules = {
      ephemeral: 1,      // 1 day
      experiences: 365,  // 1 year
      observations: 90,  // 3 months
      worldFacts: null,  // Never expire
      mentalModels: null // Never expire
    };

    // Override with user options
    if (options.ttlRules) {
      Object.assign(this.ttlRules, options.ttlRules);
    }

    this.checkInterval = options.checkInterval || 60 * 60 * 1000; // 1 hour
    this.onExpire = options.onExpire || null;
    this.intervalId = null;
  }

  /**
   * Start automatic TTL checking
   */
  start(store) {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.checkAndExpire(store);
    }, this.checkInterval);
  }

  /**
   * Stop automatic TTL checking
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check all entries and expire old ones
   */
  async checkAndExpire(store) {
    const entries = await store.list();
    const expired = [];

    for (const entry of entries) {
      if (this.isExpired(entry)) {
        expired.push(entry);
      }
    }

    for (const entry of expired) {
      await store.delete(entry.id);
      if (this.onExpire) {
        this.onExpire(entry);
      }
    }

    return { expired: expired.length, entries: expired.map(e => e.id) };
  }

  /**
   * Check if a single entry is expired
   */
  isExpired(entry) {
    const ttl = this.ttlRules[entry.layer];
    
    // null/undefined means never expire
    if (ttl === null || ttl === undefined) {
      return false;
    }

    const ageMs = Date.now() - new Date(entry.metadata.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    return ageDays > ttl;
  }

  /**
   * Get TTL info for an entry
   */
  getTTLInfo(entry) {
    const ttl = this.ttlRules[entry.layer];
    
    if (ttl === null || ttl === undefined) {
      return { expires: false, daysLeft: Infinity };
    }

    const ageMs = Date.now() - new Date(entry.metadata.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const daysLeft = Math.max(0, ttl - ageDays);

    return {
      expires: true,
      ttlDays: ttl,
      ageDays: Math.floor(ageDays),
      daysLeft: Math.floor(daysLeft),
      expired: daysLeft <= 0
    };
  }

  /**
   * Set custom TTL for a layer
   */
  setTTL(layer, days) {
    const validLayers = ['ephemeral', 'experiences', 'observations', 'worldFacts', 'mentalModels'];
    if (!validLayers.includes(layer)) {
      throw new Error(`Invalid layer: ${layer}`);
    }
    this.ttlRules[layer] = days;
  }
}

module.exports = { TTLManager };
