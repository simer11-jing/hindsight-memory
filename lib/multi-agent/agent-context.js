/**
 * AgentContext - 跨 Agent 记忆共享的核心
 * 
 * 设计原则：
 * - 每个 Agent 有独立命名空间（agent_id）
 * - 共享记忆层（shared/）所有 Agent 可见
 * - 私有记忆层（agents/<agent_id>/）仅自己可见
 * - Agent 贡献的记忆自动带 agent_tag，方便追溯
 */

const fs = require('fs');
const path = require('path');
const { MemoryEntry } = require('../memory-entry');

class AgentContext {
  constructor(agentId, options = {}) {
    this.agentId = agentId;
    this.baseDir = options.baseDir || process.env.MEMORY_BASE_DIR || path.join(process.env.HOME, '.openclaw/agents');
    this.sharedDir = path.join(this.baseDir, 'shared');
    this.agentDir = path.join(this.baseDir, agentId);
    this.config = this._loadConfig();
  }

  _loadConfig() {
    const configPath = path.join(this.agentDir, 'memory-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    // 全局默认配置
    return {
      shared: { enabled: true, layers: ['mentalModels', 'worldFacts'] },
      private: { enabled: true, layers: ['experiences', 'observations'] }
    };
  }

  // ==================== 路径 ====================

  getMemoryPath(layer, type = 'private') {
    // type: 'private' | 'shared'
    if (type === 'shared') {
      return path.join(this.sharedDir, `${layer}.md`);
    }
    return path.join(this.agentDir, 'memory', `${layer}.md`);
  }

  getSharedIndexPath() {
    return path.join(this.sharedDir, '.index.json');
  }

  // ==================== 共享记忆读取 ====================

  /**
   * 读取指定层的共享记忆
   */
  async readShared(layer) {
    const filePath = this.getMemoryPath(layer, 'shared');
    if (!fs.existsSync(filePath)) return [];
    
    const content = fs.readFileSync(filePath, 'utf8');
    return this._parseEntries(content, layer, 'shared');
  }

  /**
   * 读取所有共享记忆
   */
  async readAllShared(layers = null) {
    const targetLayers = layers || ['mentalModels', 'worldFacts', 'observations', 'experiences'];
    const results = {};
    
    for (const layer of targetLayers) {
      results[layer] = await this.readShared(layer);
    }
    return results;
  }

  // ==================== 共享记忆写入 ====================

  /**
   * 写入共享记忆（所有 Agent 可见）
   * @param {string} layer - 层级
   * @param {string} content - 内容
   * @param {object} meta - 元数据 { source: 'agent', confidence: 0.9 }
   */
  async writeShared(layer, content, meta = {}) {
    const filePath = this.getMemoryPath(layer, 'shared');
    
    // 确保目录存在
    if (!fs.existsSync(this.sharedDir)) {
      fs.mkdirSync(this.sharedDir, { recursive: true });
    }

    // 追加内容，带 Agent 来源标记
    const timestamp = new Date().toISOString();
    const entry = [
      `---`,
      `source: ${meta.source || this.agentId}`,
      `layer: ${layer}`,
      `timestamp: ${timestamp}`,
      `agent: ${this.agentId}`,
      `confidence: ${meta.confidence || 0.8}`,
      `tags: ${(meta.tags || []).join(', ')}`,
      `---`,
      content.trim(),
      ''
    ].join('\n');

    fs.appendFileSync(filePath, entry + '\n', 'utf8');
    
    // 更新索引
    await this._updateSharedIndex(layer, { content, timestamp, agent: this.agentId, ...meta });
    
    return { layer, content, agent: this.agentId, timestamp };
  }

  // ==================== 团队查询 ====================

  /**
   * 查询团队记忆（所有 Agent 的共享记忆）
   * @param {string} query - 查询文本
   * @param {object} options - { layers, agents, limit }
   */
  async queryTeam(query, options = {}) {
    const { layers = null, agents = null, limit = 10 } = options;
    const allShared = await this.readAllShared(layers);
    
    // 按 Agent 过滤
    let filtered = {};
    for (const [layer, entries] of Object.entries(allShared)) {
      if (agents) {
        entries = entries.filter(e => agents.includes(e.agent));
      }
      if (entries.length > 0) {
        filtered[layer] = entries;
      }
    }

    // 简单关键词匹配 + 排名
    const scored = [];
    const queryLower = query.toLowerCase();
    
    for (const [layer, entries] of Object.entries(filtered)) {
      for (const entry of entries) {
        const contentLower = entry.content.toLowerCase();
        const score = this._calcRelevance(queryLower, contentLower);
        if (score > 0.1) {
          scored.push({ ...entry, layer, score });
        }
      }
    }

    // 排序并返回 top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * 获取团队记忆统计
   */
  async teamStats() {
    const layers = ['mentalModels', 'worldFacts', 'observations', 'experiences'];
    const stats = {};
    const agents = new Set();

    for (const layer of layers) {
      const entries = await this.readShared(layer);
      stats[layer] = entries.length;
      for (const e of entries) {
        if (e.agent) agents.add(e.agent);
      }
    }

    return { layers: stats, agents: Array.from(agents), totalContributions: Object.values(stats).reduce((a, b) => a + b, 0) };
  }

  // ==================== Agent 私有记忆 ====================

  /**
   * 读取当前 Agent 的私有记忆
   */
  async readPrivate(layer) {
    const filePath = this.getMemoryPath(layer, 'private');
    if (!fs.existsSync(filePath)) return [];
    
    const content = fs.readFileSync(filePath, 'utf8');
    return this._parseEntries(content, layer, 'private');
  }

  /**
   * 写入当前 Agent 的私有记忆
   */
  async writePrivate(layer, content, meta = {}) {
    const filePath = this.getMemoryPath(layer, 'private');
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const entry = [
      `---`,
      `source: ${meta.source || this.agentId}`,
      `layer: ${layer}`,
      `timestamp: ${timestamp}`,
      `agent: ${this.agentId}`,
      `confidence: ${meta.confidence || 0.8}`,
      `tags: ${(meta.tags || []).join(', ')}`,
      `---`,
      content.trim(),
      ''
    ].join('\n');

    fs.appendFileSync(filePath, entry + '\n', 'utf8');
    return { layer, content, agent: this.agentId, timestamp };
  }

  // ==================== 工具方法 ====================

  _parseEntries(content, layer, type) {
    // 简单 YAML 分隔符解析
    const entries = [];
    const blocks = content.split(/^---$/m).filter(b => b.trim());
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const meta = {};
      let body = [];
      
      for (const line of lines) {
        const [key, ...vals] = line.split(':');
        if (vals.length > 0 && ['source', 'layer', 'timestamp', 'agent', 'confidence', 'tags'].includes(key.trim())) {
          meta[key.trim()] = vals.join(':').trim();
        } else {
          body.push(line);
        }
      }
      
      if (body.length > 0) {
        entries.push({
          content: body.join('\n').trim(),
          layer,
          type,
          ...meta
        });
      }
    }
    return entries;
  }

  _calcRelevance(query, content) {
    const queryWords = query.split(/\s+/);
    const contentWords = content.split(/\s+/);
    let score = 0;
    
    for (const qw of queryWords) {
      if (content.includes(qw)) score += 1;
      // 简短匹配奖励
      if (qw.length > 3 && content.includes(qw)) score += 0.5;
    }
    
    // 归一化
    return score / queryWords.length;
  }

  async _updateSharedIndex(layer, entry) {
    const indexPath = this.getSharedIndexPath();
    let index = {};
    
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }
    
    if (!index[layer]) index[layer] = [];
    index[layer].push({
      content: entry.content.substring(0, 100),
      timestamp: entry.timestamp,
      agent: entry.agent
    });
    
    // 只保留最近 100 条
    if (index[layer].length > 100) {
      index[layer] = index[layer].slice(-100);
    }
    
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }
}

module.exports = { AgentContext };
