/**
 * MemoryManager - Main entry point for the memory system
 * Unified API for storage, retrieval, and lifecycle management
 */

const { MemoryEntry } = require('./memory-entry');
const { HybridStore } = require('./storage/hybrid-store');
const { HybridSearch } = require('./retrieval/hybrid-search');
const { TTLManager } = require('./lifecycle/ttl-manager');
const { Compression } = require('./lifecycle/compression');
const { Archival } = require('./lifecycle/archival');

class MemoryManager {
  constructor(options = {}) {
    // Storage
    this.store = new HybridStore(options.storage);

    // Retrieval
    this.search = new HybridSearch(options.search);

    // Lifecycle
    this.ttl = new TTLManager(options.ttl);
    this.compression = new Compression(options.compression);
    this.archival = new Archival(options.archival);

    this.initialized = false;
    this.config = options;
  }

  /**
   * Initialize the memory system
   */
  async init() {
    if (this.initialized) return;

    await this.store.init();
    
    // Auto-start TTL manager if configured
    if (this.config.ttl?.autoStart !== false) {
      this.ttl.start(this.store);
    }

    this.initialized = true;
    return this;
  }

  /**
   * Create a new memory entry
   */
  async create(data) {
    this._ensureInit();

    const validation = MemoryEntry.validate(data);
    if (!validation.valid) {
      throw new Error(`Invalid entry: ${validation.errors.join(', ')}`);
    }

    const entry = new MemoryEntry(data);
    await this.store.create(entry);
    return entry;
  }

  /**
   * Retrieve a memory by ID
   */
  async get(id) {
    this._ensureInit();
    return this.store.read(id);
  }

  /**
   * Update a memory
   */
  async update(id, updates) {
    this._ensureInit();
    return this.store.update(id, updates);
  }

  /**
   * Delete a memory
   */
  async delete(id) {
    this._ensureInit();
    return this.store.delete(id);
  }

  /**
   * Search memories
   */
  async search(query, options = {}) {
    this._ensureInit();

    const entries = await this.store.list(options.filter);
    const results = this.search.search(entries, query);

    if (options.limit) {
      return results.slice(0, options.limit);
    }
    return results;
  }

  /**
   * List memories with filtering
   */
  async list(options = {}) {
    this._ensureInit();
    return this.store.list(options);
  }

  /**
   * Remember something (convenience method)
   */
  async remember(content, options = {}) {
    this._ensureInit();

    return this.create({
      layer: options.layer || 'observations',
      content,
      metadata: {
        source: options.source || 'user',
        tags: options.tags || [],
        entities: options.entities || [],
        importance: options.importance || 0.5,
        ...options.metadata
      }
    });
  }

  /**
   * Recall memories (convenience method)
   */
  async recall(query, options = {}) {
    this._ensureInit();

    const results = await this.search(query, options);
    return results.map(r => r.entry);
  }

  /**
   * Get memories about a specific entity
   */
  async about(entity, options = {}) {
    this._ensureInit();

    const all = await this.store.list();
    const related = all.filter(e => 
      e.metadata.entities.includes(entity) ||
      e.content.toLowerCase().includes(entity.toLowerCase())
    );

    return options.limit ? related.slice(0, options.limit) : related;
  }

  /**
   * Get recent memories
   */
  async recent(limit = 10) {
    this._ensureInit();

    const entries = await this.store.list();
    return entries
      .sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt))
      .slice(0, limit);
  }

  /**
   * Get important memories
   */
  async important(limit = 10) {
    this._ensureInit();

    const entries = await this.store.list();
    return entries
      .sort((a, b) => b.metadata.importance - a.metadata.importance)
      .slice(0, limit);
  }

  /**
   * Run lifecycle maintenance
   */
  async maintenance() {
    this._ensureInit();

    const results = {
      ttl: await this.ttl.checkAndExpire(this.store),
      compression: await this.compression.process(this.store),
      archival: await this.archival.process(this.store)
    };

    return results;
  }

  /**
   * Get memory statistics
   */
  async stats() {
    this._ensureInit();

    const entries = await this.store.list();
    const byLayer = {};
    let totalSize = 0;

    for (const entry of entries) {
      byLayer[entry.layer] = (byLayer[entry.layer] || 0) + 1;
      totalSize += entry.content.length;
    }

    return {
      total: entries.length,
      byLayer,
      totalSize,
      avgSize: entries.length > 0 ? Math.round(totalSize / entries.length) : 0,
      archives: this.archival.listArchives()
    };
  }

  /**
   * Export all memories
   */
  async export() {
    this._ensureInit();

    const entries = await this.store.list();
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      entries: entries.map(e => e.toJSON())
    };
  }

  /**
   * Import memories
   */
  async import(data) {
    this._ensureInit();

    const imported = [];
    for (const entryData of data.entries || []) {
      try {
        const entry = MemoryEntry.fromJSON(entryData);
        await this.store.create(entry);
        imported.push(entry.id);
      } catch (err) {
        // Skip invalid entries
      }
    }

    return { imported: imported.length, ids: imported };
  }

  /**
   * Close and cleanup
   */
  async close() {
    this.ttl.stop();
    await this.store.close();
    this.initialized = false;
  }

  _ensureInit() {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized. Call init() first.');
    }
  }
}

module.exports = { MemoryManager, MemoryEntry };
