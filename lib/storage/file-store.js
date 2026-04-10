/**
 * 文件存储适配器
 */

const fs = require('fs');
const path = require('path');
const { MemoryEntry } = require('../memory-entry');

/**
 * 文件存储
 */
class FileStorage {
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.indexFile = path.join(this.baseDir, '.memory-index.json');
    this.entriesFile = path.join(this.baseDir, '.memory-entries.json');
  }
  
  /**
   * 保存
   */
  async save(entry) {
    const entries = await this.getAll();
    
    // 查找并更新或添加
    const index = entries.findIndex(e => e.id === entry.id);
    
    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }
    
    // 写入文件
    fs.writeFileSync(this.entriesFile, JSON.stringify(entries, null, 2), 'utf-8');
    
    // 更新索引
    await this.updateIndex();
  }
  
  /**
   * 获取单个
   */
  async get(id) {
    const entries = await this.getAll();
    return entries.find(e => e.id === id) || null;
  }
  
  /**
   * 获取全部
   */
  async getAll() {
    if (!fs.existsSync(this.entriesFile)) {
      return [];
    }
    
    try {
      const data = fs.readFileSync(this.entriesFile, 'utf-8');
      const entries = JSON.parse(data);
      
      return entries.map(e => MemoryEntry.fromObject(e));
    } catch (e) {
      return [];
    }
  }
  
  /**
   * 按层级获取
   */
  async getByLayer(layer) {
    const entries = await this.getAll();
    return entries.filter(e => e.layer === layer);
  }
  
  /**
   * 删除
   */
  async delete(id) {
    const entries = await this.getAll();
    const filtered = entries.filter(e => e.id !== id);
    
    fs.writeFileSync(this.entriesFile, JSON.stringify(filtered, null, 2), 'utf-8');
  }
  
  /**
   * 查询
   */
  async query(filter) {
    const entries = await this.getAll();
    
    let results = entries;
    
    if (filter.layer) {
      results = results.filter(e => e.layer === filter.layer);
    }
    
    if (filter.tags) {
      results = results.filter(e => 
        filter.tags.some(tag => e.metadata.tags.includes(tag))
      );
    }
    
    if (filter.minImportance) {
      results = results.filter(e => 
        e.importance >= filter.minImportance
      );
    }
    
    if (filter.since) {
      results = results.filter(e => 
        new Date(e.createdAt) >= new Date(filter.since)
      );
    }
    
    return results;
  }
  
  /**
   * 更新索引
   */
  async updateIndex() {
    const entries = await this.getAll();
    
    const index = {
      total: entries.length,
      byLayer: {},
      lastModified: new Date().toISOString()
    };
    
    for (const entry of entries) {
      index.byLayer[entry.layer] = (index.byLayer[entry.layer] || 0) + 1;
    }
    
    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
  }
}

/**
 * 创建存储实例
 */
function createFileStorage(options) {
  return new FileStorage(options);
}

module.exports = {
  FileStorage,
  createFileStorage
};