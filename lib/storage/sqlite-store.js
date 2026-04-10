/**
 * SQLiteStore - SQLite-based storage for memory entries
 * Requires better-sqlite3 or similar (optional dependency)
 */

const { MemoryEntry } = require('../memory-entry');

class SQLiteStore {
  constructor(options = {}) {
    this.dbPath = options.dbPath || './memory.db';
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Dynamic import to make it optional
      const sqlite3 = require('better-sqlite3');
      this.db = new sqlite3(this.dbPath);
      this._createTables();
      this.initialized = true;
    } catch (err) {
      throw new Error(`SQLite not available: ${err.message}. Install better-sqlite3 to use SQLiteStore.`);
    }
  }

  _createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        layer TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT,
        tags TEXT,
        entities TEXT,
        importance REAL DEFAULT 0.5,
        created_at TEXT,
        accessed_at TEXT,
        access_count INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_layer ON memories(layer);
      CREATE INDEX IF NOT EXISTS idx_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_created ON memories(created_at);
    `);
  }

  _rowToEntry(row) {
    return new MemoryEntry({
      id: row.id,
      layer: row.layer,
      content: row.content,
      metadata: {
        source: row.source || '',
        tags: row.tags ? JSON.parse(row.tags) : [],
        entities: row.entities ? JSON.parse(row.entities) : [],
        importance: row.importance,
        createdAt: new Date(row.created_at),
        accessedAt: new Date(row.accessed_at),
        accessCount: row.access_count
      }
    });
  }

  _entryToRow(entry) {
    return {
      id: entry.id,
      layer: entry.layer,
      content: entry.content,
      source: entry.metadata.source,
      tags: JSON.stringify(entry.metadata.tags),
      entities: JSON.stringify(entry.metadata.entities),
      importance: entry.metadata.importance,
      created_at: entry.metadata.createdAt.toISOString(),
      accessed_at: entry.metadata.accessedAt.toISOString(),
      access_count: entry.metadata.accessCount
    };
  }

  async create(entry) {
    await this.init();
    const row = this._entryToRow(entry);
    
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, layer, content, source, tags, entities, importance, created_at, accessed_at, access_count)
      VALUES (@id, @layer, @content, @source, @tags, @entities, @importance, @created_at, @accessed_at, @access_count)
    `);
    
    stmt.run(row);
    return entry;
  }

  async read(id) {
    await this.init();
    
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id);
    
    if (row) {
      // Update access stats
      const updateStmt = this.db.prepare(`
        UPDATE memories SET accessed_at = ?, access_count = access_count + 1 WHERE id = ?
      `);
      updateStmt.run(new Date().toISOString(), id);
      
      return this._rowToEntry(row);
    }
    
    return null;
  }

  async update(id, updates) {
    await this.init();
    
    const entry = await this.read(id);
    if (!entry) return null;

    if (updates.content !== undefined) entry.content = updates.content;
    if (updates.layer !== undefined) entry.layer = updates.layer;
    if (updates.metadata) {
      Object.assign(entry.metadata, updates.metadata);
    }

    const row = this._entryToRow(entry);
    const stmt = this.db.prepare(`
      UPDATE memories SET
        layer = @layer,
        content = @content,
        source = @source,
        tags = @tags,
        entities = @entities,
        importance = @importance
      WHERE id = @id
    `);
    
    stmt.run(row);
    return entry;
  }

  async delete(id) {
    await this.init();
    
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async list(options = {}) {
    await this.init();
    
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params = [];

    if (options.layer) {
      sql += ' AND layer = ?';
      params.push(options.layer);
    }

    sql += ' ORDER BY importance DESC, created_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    return rows.map(r => this._rowToEntry(r));
  }

  async search(query) {
    await this.init();
    
    const pattern = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM memories 
      WHERE content LIKE ? 
         OR source LIKE ?
         OR tags LIKE ?
         OR entities LIKE ?
      ORDER BY importance DESC
    `);
    
    const rows = stmt.all(pattern, pattern, pattern, pattern);
    return rows.map(r => this._rowToEntry(r));
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

module.exports = { SQLiteStore };
