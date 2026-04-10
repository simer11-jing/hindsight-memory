/**
 * Memory Manager - 统一 API 入口
 * 提供读写检索和生命周期管理
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { MemoryEntry, SearchResult, MemoryStats, LAYERS, LAYER_DEFINITIONS } = require('./memory-entry');

// 默认配置
const DEFAULT_CONFIG = {
  memory: {
    maxLinesPerLayer: 200,
    maxSizeKB: 25,
    autoCompression: true,
    compressionThreshold: 100
  },
  storage: {
    primary: 'file',
    enableSQLite: false,
    enableVector: false
  },
  retrieval: {
    defaultLimit: 10,
    hybridRrfK: 60
  }
};

/**
 * Memory Manager 主类
 */
class MemoryManager {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.memoryDir = options.memoryDir || path.join(os.homedir(), '.openclaw/agents/main');
    this.memoryFile = options.memoryFile || path.join(this.memoryDir, 'MEMORY.md');
    this.dailyDir = options.dailyDir || path.join(this.memoryDir, 'memory');
    
    // 内存缓存
    this.cache = new Map();
    this.cacheEnabled = true;
  }
  
  /**
   * 初始化
   */
  async init() {
    // 确保目录存在
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.dailyDir)) {
      fs.mkdirSync(this.dailyDir, { recursive: true });
    }
    
    // 加载现有记忆
    await this.load();
    
    console.log('✅ Memory Manager 初始化完成');
  }
  
  /**
   * 加载记忆到缓存
   */
  async load() {
    this.cache.clear();
    
    // 读取主文件
    if (fs.existsSync(this.memoryFile)) {
      const content = fs.readFileSync(this.memoryFile, 'utf-8');
      const entries = this.parseMemoryFile(content);
      
      for (const entry of entries) {
        this.cache.set(entry.id, entry);
      }
    }
  }
  
  /**
   * 解析 MEMORY.md 文件
   */
  parseMemoryFile(content) {
    const entries = [];
    const lines = content.split('\n');
    
    let currentLayer = null;
    let currentContent = [];
    
    for (const line of lines) {
      // 检测层级
      for (const [layer, def] of Object.entries(LAYER_DEFINITIONS)) {
        if (line.includes(def.name) || line.match(new RegExp(`##\\s+${def.emoji}`))) {
          // 保存之前的
          if (currentLayer && currentContent.length > 0) {
            const entry = MemoryEntry.create(
              currentContent.join('\n').trim(),
              currentLayer,
              { source: 'memory-file' }
            );
            entries.push(entry);
          }
          
          currentLayer = layer;
          currentContent = [];
          break;
        }
      }
      
      if (currentLayer && line.trim()) {
        currentContent.push(line);
      }
    }
    
    // 最后一个
    if (currentLayer && currentContent.length > 0) {
      const entry = MemoryEntry.create(
        currentContent.join('\n').trim(),
        currentLayer,
        { source: 'memory-file' }
      );
      entries.push(entry);
    }
    
    return entries;
  }
  
  /**
   * 添加记忆
   */
  async add(content, layer, options = {}) {
    if (!MemoryEntry.isValidLayer(layer)) {
      throw new Error(`Invalid layer: ${layer}`);
    }
    
    const entry = MemoryEntry.create(content, layer, {
      ...options,
      entities: options.entities || MemoryEntry.extractEntities(content),
      tags: options.tags || MemoryEntry.extractTags(content)
    });
    
    // 缓存
    this.cache.set(entry.id, entry);
    
    // 持久化
    await this.persist(entry);
    
    return entry;
  }
  
  /**
   * 添加短期记忆
   */
  async addEphemeral(content, sessionId) {
    return this.add(content, LAYERS.EPHEMERAL, {
      sessionId,
      source: 'ephemeral'
    });
  }
  
  /**
   * 获取记忆
   */
  async get(id) {
    let entry = this.cache.get(id);
    
    if (entry) {
      entry = MemoryEntry.recordAccess(entry);
      this.cache.set(id, entry);
    }
    
    return entry || null;
  }
  
  /**
   * 按层级获取
   */
  async getByLayer(layer) {
    const results = [];
    
    for (const [id, entry] of this.cache) {
      if (entry.layer === layer) {
        results.push(entry);
      }
    }
    
    return results;
  }
  
  /**
   * 搜索
   */
  async search(query, options = {}) {
    const {
      layer = 'all',
      limit = this.config.retrieval.defaultLimit,
      useSemantic = false
    } = options;
    
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [id, entry] of this.cache) {
      // 按层级过滤
      if (layer !== 'all' && entry.layer !== layer) {
        continue;
      }
      
      // 关键词匹配
      const contentLower = entry.content.toLowerCase();
      if (contentLower.includes(queryLower)) {
        // 计算简单的相关性分数
        const matches = contentLower.split(queryLower).length - 1;
        const score = matches / entry.content.length;
        
        results.push(new SearchResult(entry, score * 10, 'keyword'));
      }
      
      // TODO: 向量搜索（如果启用）
    }
    
    // 按分数排序
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, limit);
  }
  
  /**
   * 按层级搜索
   */
  async searchByLayer(layer, query) {
    return this.search(query, { layer, limit: 20 });
  }
  
  /**
   * 持久化到文件
   */
  async persist(entry) {
    if (entry.layer === LAYERS.EPHEMERAL) {
      // 短期记忆不持久化
      return;
    }
    
    // 更新 MEMORY.md 文件
    await this.updateMemoryFile(entry);
  }
  
  /**
   * 更新 MEMORY.md 文件
   */
  async updateMemoryFile(newEntry) {
    let content = '';
    
    if (fs.existsSync(this.memoryFile)) {
      content = fs.readFileSync(this.memoryFile, 'utf-8');
    } else {
      content = this.generateMemoryTemplate();
    }
    
    // 简单实现：追加到对应层级
    const layerDef = LAYER_DEFINITIONS[newEntry.layer];
    const emoji = layerDef ? layerDef.emoji : '📄';
    
    // 查找或创建层级章节
    const layerSection = `## ${emoji} ${layerDef.name}`;
    
    if (!content.includes(layerSection)) {
      // 添加新章节
      content += `\n\n${layerSection}\n\n`;
    }
    
    // 简单追加（实际应该解析后重新生成）
    // TODO: 实现完整的文件更新逻辑
    
    // 写入文件
    // fs.writeFileSync(this.memoryFile, content, 'utf-8');
  }
  
  /**
   * 生成 MEMORY.md 模板
   */
  generateMemoryTemplate() {
    return `# MEMORY.md - 长期记忆

> 此文件基于 Hindsight 5 层架构
> 最后更新: ${new Date().toISOString()}

---

${Object.values(LAYER_DEFINITIONS).map(def => 
  `## ${def.emoji} ${def.name}\n\n${def.description}\n`
).join('\n')}

---

*使用 Memory Manager 管理此文件*
`;
  }
  
  /**
   * 获取统计信息
   */
  async getStats() {
    const entries = Array.from(this.cache.values());
    return new MemoryStats(entries);
  }
  
  /**
   * 导出
   */
  async export(format = 'json') {
    const entries = Array.from(this.cache.values());
    
    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else if (format === 'md') {
      let md = '# Memory Export\n\n';
      
      for (const layer of Object.values(LAYERS)) {
        const layerEntries = entries.filter(e => e.layer === layer);
        
        if (layerEntries.length === 0) continue;
        
        const def = LAYER_DEFINITIONS[layer];
        md += `## ${def.emoji} ${def.name}\n\n`;
        
        for (const entry of layerEntries) {
          md += `- ${entry.content.substring(0, 100)}...\n`;
        }
        
        md += '\n';
      }
      
      return md;
    }
    
    throw new Error(`Unsupported format: ${format}`);
  }
  
  /**
   * 压缩/合并
   */
  async consolidate() {
    console.log('🔄 记忆压缩功能 - 待实现');
    // TODO: 实现自动压缩逻辑
  }
  
  /**
   * 归档
   */
  async archive(days = 365) {
    console.log('📦 归档功能 - 待实现');
    // TODO: 实现归档逻辑
  }
  
  /**
   * 删除
   */
  async forget(id) {
    const entry = this.cache.get(id);
    
    if (entry) {
      this.cache.delete(id);
      console.log(`✅ 已删除记忆: ${id}`);
    }
  }
  
  /**
   * 备份
   */
  async backup() {
    const backupDir = path.join(this.memoryDir, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `memory-${timestamp}.json`);
    
    const entries = Array.from(this.cache.values());
    fs.writeFileSync(backupFile, JSON.stringify(entries, null, 2), 'utf-8');
    
    console.log(`✅ 备份完成: ${backupFile}`);
    return backupFile;
  }
}

/**
 * 创建默认实例
 */
function createMemoryManager(options) {
  const manager = new MemoryManager(options);
  return manager;
}

module.exports = {
  MemoryManager,
  createMemoryManager,
  LAYERS,
  LAYER_DEFINITIONS
};