/**
 * MemoryEntry 数据模型
 * 5 层架构的记忆条目定义
 */

const crypto = require('crypto');

/**
 * 记忆层级枚举
 */
const LAYERS = {
  EPHEMERAL: 'ephemeral',
  EXPERIENCES: 'experiences',
  OBSERVATIONS: 'observations',
  WORLD_FACTS: 'worldFacts',
  MENTAL_MODELS: 'mentalModels'
};

/**
 * 层级定义
 */
const LAYER_DEFINITIONS = {
  [LAYERS.EPHEMERAL]: {
    name: 'Ephemeral',
    emoji: '💫',
    description: '短期工作记忆，当前会话上下文',
    ttl: 'session',
    storage: 'memory'
  },
  [LAYERS.EXPERIENCES]: {
    name: 'Experiences',
    emoji: '🎭',
    description: '具体经历、事件、对话',
    ttl: '90 days',
    storage: 'file'
  },
  [LAYERS.OBSERVATIONS]: {
    name: 'Observations',
    emoji: '👁️',
    description: '观察到的模式、规律',
    ttl: '180 days',
    storage: 'file'
  },
  [LAYERS.WORLD_FACTS]: {
    name: 'World Facts',
    emoji: '🌍',
    description: '客观事实、知识',
    ttl: 'permanent',
    storage: 'file'
  },
  [LAYERS.MENTAL_MODELS]: {
    name: 'Mental Models',
    emoji: '🧠',
    description: '精炼智慧、核心信念',
    ttl: 'permanent',
    storage: 'file'
  }
};

/**
 * MemoryEntry 类
 */
class MemoryEntry {
  /**
   * 创建新记忆条目
   */
  static create(content, layer, options = {}) {
    const now = new Date();
    
    return {
      id: options.id || crypto.randomUUID(),
      layer,
      content: content.trim(),
      embedding: options.embedding || null,
      metadata: {
        source: options.source || 'manual',
        tags: options.tags || [],
        entities: options.entities || [],
        sessionId: options.sessionId || null,
        parentId: options.parentId || null
      },
      importance: options.importance || 0.5,
      createdAt: options.createdAt || now,
      accessedAt: now,
      accessCount: 0
    };
  }
  
  /**
   * 从对象创建
   */
  static fromObject(obj) {
    return {
      ...obj,
      createdAt: new Date(obj.createdAt),
      accessedAt: new Date(obj.accessedAt)
    };
  }
  
  /**
   * 更新访问信息
   */
  static recordAccess(entry) {
    return {
      ...entry,
      accessedAt: new Date(),
      accessCount: (entry.accessCount || 0) + 1
    };
  }
  
  /**
   * 获取层级的显示名称
   */
  static getLayerDisplay(layer) {
    const def = LAYER_DEFINITIONS[layer];
    return def ? `${def.emoji} ${def.name}` : layer;
  }
  
  /**
   * 获取层级的 emoji
   */
  static getLayerEmoji(layer) {
    const def = LAYER_DEFINITIONS[layer];
    return def ? def.emoji : '📄';
  }
  
  /**
   * 验证层级是否有效
   */
  static isValidLayer(layer) {
    return Object.values(LAYERS).includes(layer);
  }
  
  /**
   * 获取层级定义
   */
  static getLayerDefinition(layer) {
    return LAYER_DEFINITIONS[layer];
  }
  
  /**
   * 提取内容中的实体
   */
  static extractEntities(content) {
    const entities = [];
    
    // 邮箱
    const emails = content.match(/[\w.-]+@[\w.-]+\.\w+/g);
    if (emails) entities.push(...emails);
    
    // URL
    const urls = content.match(/https?:\/\/[^\s]+/g);
    if (urls) entities.push(...urls);
    
    // IP 地址
    const ips = content.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g);
    if (ips) entities.push(...ips);
    
    // 标签（如 #标签）
    const tags = content.match(/#[\w-]+/g);
    if (tags) entities.push(...tags.map(t => t.slice(1)));
    
    return [...new Set(entities)];
  }
  
  /**
   * 提取内容中的标签
   */
  static extractTags(content) {
    const tags = [];
    
    // 从内容中提取可能的标签
    const patterns = [
      /(?:标签|tag)[:：]\s*([^\n]+)/i,
      /\[([^\]]+)\]/g
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        tags.push(...matches.slice(1).map(m => m.trim()));
      }
    }
    
    return [...new Set(tags)];
  }
  
  /**
   * 序列化（用于存储）
   */
  serialize() {
    return JSON.stringify({
      ...this,
      createdAt: this.createdAt.toISOString(),
      accessedAt: this.accessedAt.toISOString()
    });
  }
  
  /**
   * 反序列化（从存储读取）
   */
  static deserialize(json) {
    const obj = JSON.parse(json);
    return MemoryEntry.fromObject(obj);
  }
}

/**
 * 搜索结果
 */
class SearchResult {
  constructor(entry, score, matchType) {
    this.entry = entry;
    this.score = score;
    this.matchType = matchType; // 'keyword' | 'semantic' | 'hybrid'
  }
  
  toObject() {
    return {
      id: this.entry.id,
      layer: this.entry.layer,
      content: this.entry.content,
      score: this.score,
      matchType: this.matchType,
      metadata: this.entry.metadata
    };
  }
}

/**
 * 记忆统计
 */
class MemoryStats {
  constructor(entries) {
    this.total = entries.length;
    this.byLayer = {};
    this.totalSize = 0;
    this.lastModified = null;
    
    for (const entry of entries) {
      // 按层级统计
      this.byLayer[entry.layer] = (this.byLayer[entry.layer] || 0) + 1;
      
      // 统计大小
      this.totalSize += JSON.stringify(entry).length;
      
      // 最后修改时间
      if (!this.lastModified || entry.accessedAt > this.lastModified) {
        this.lastModified = entry.accessedAt;
      }
    }
  }
  
  getByLayer(layer) {
    return this.byLayer[layer] || 0;
  }
  
  getSizeKB() {
    return (this.totalSize / 1024).toFixed(2);
  }
}

module.exports = {
  MemoryEntry,
  SearchResult,
  MemoryStats,
  LAYERS,
  LAYER_DEFINITIONS
};