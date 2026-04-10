/**
 * Archival - Move old memories to archive storage
 */

const fs = require('fs');
const path = require('path');

class Archival {
  constructor(options = {}) {
    this.archiveDir = options.archiveDir || './memory/archive';
    this.archiveAfterDays = options.archiveAfterDays || 365;
    this.layersToArchive = options.layersToArchive || ['ephemeral', 'experiences', 'observations'];
    this.minAccessCount = options.minAccessCount || 0;
    this.onArchive = options.onArchive || null;
  }

  /**
   * Check if entry should be archived
   */
  shouldArchive(entry) {
    // Skip if not in archiveable layers
    if (!this.layersToArchive.includes(entry.layer)) {
      return false;
    }

    // Skip frequently accessed entries
    if (entry.metadata.accessCount > this.minAccessCount) {
      return false;
    }

    const ageMs = Date.now() - new Date(entry.metadata.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    return ageDays > this.archiveAfterDays;
  }

  /**
   * Archive a single entry
   */
  async archive(store, entry) {
    // Ensure archive directory exists
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }

    const archiveFile = path.join(this.archiveDir, `${entry.layer}.jsonl`);
    const archiveRecord = {
      ...entry.toJSON(),
      archivedAt: new Date().toISOString()
    };

    // Append to archive file
    fs.appendFileSync(archiveFile, JSON.stringify(archiveRecord) + '\n');

    // Remove from active store
    await store.delete(entry.id);

    if (this.onArchive) {
      this.onArchive(entry);
    }

    return entry.id;
  }

  /**
   * Archive all eligible entries
   */
  async process(store) {
    const entries = await store.list();
    const archived = [];

    for (const entry of entries) {
      if (this.shouldArchive(entry)) {
        await this.archive(store, entry);
        archived.push(entry.id);
      }
    }

    return { archived: archived.length, ids: archived };
  }

  /**
   * Restore archived entries by layer
   */
  async restore(store, layer) {
    const archiveFile = path.join(this.archiveDir, `${layer}.jsonl`);
    
    if (!fs.existsSync(archiveFile)) {
      return { restored: 0, ids: [] };
    }

    const { MemoryEntry } = require('../memory-entry');
    const content = fs.readFileSync(archiveFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    const restored = [];
    const remaining = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const entry = MemoryEntry.fromJSON(data);
        
        // Check if already exists
        const existing = await store.read(entry.id);
        if (!existing) {
          await store.create(entry);
          restored.push(entry.id);
        } else {
          remaining.push(line);
        }
      } catch (err) {
        remaining.push(line);
      }
    }

    // Rewrite archive file without restored entries
    if (remaining.length > 0) {
      fs.writeFileSync(archiveFile, remaining.join('\n') + '\n');
    } else {
      fs.unlinkSync(archiveFile);
    }

    return { restored: restored.length, ids: restored };
  }

  /**
   * List archived layers
   */
  listArchives() {
    if (!fs.existsSync(this.archiveDir)) {
      return [];
    }

    return fs.readdirSync(this.archiveDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        layer: f.replace('.jsonl', ''),
        file: path.join(this.archiveDir, f),
        size: fs.statSync(path.join(this.archiveDir, f)).size
      }));
  }

  /**
   * Search within archives
   */
  async searchArchives(query) {
    const results = [];
    const archives = this.listArchives();

    for (const { file } of archives) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const searchable = `${entry.content} ${entry.metadata?.tags?.join(' ') || ''}`;
          
          if (searchable.toLowerCase().includes(query.toLowerCase())) {
            results.push(entry);
          }
        } catch (err) {
          // Skip invalid lines
        }
      }
    }

    return results;
  }
}

module.exports = { Archival };
