/**
 * agent-context.js - 跨 Agent 记忆共享核心类
 * 
 * 支持共享层和私有层记忆，支持 readShared/writeShared/queryTeam 等操作
 */

const fs = require('fs');
const path = require('path');

// 允许写入共享层的 Agent 白名单
const ALLOWED_AGENTS = new Set([
  'main',
  'analyst',
  'intelligence',
  'reviewer',
  'coder',
  'kairos',
  'self-evolving-agent',
  'jingcai-monitor',
  'jingcai-analyzer',
  'jingcai-learner'
]);

class AgentContext {
  /**
   * @param {string} agentId - 当前 Agent ID
   * @param {object} options - 配置选项
   */
  constructor(agentId, options = {}) {
    this.agentId = agentId;
    if (!ALLOWED_AGENTS.has(agentId)) {
      console.warn(`⚠️ Agent '${agentId}' 不在已知的白名单内，写入将被拒绝`);
    }
    this.baseDir = options.baseDir ||
      process.env.OPENCLAW_BASE_DIR ||
      path.resolve(process.env.HOME, '.openclaw/agents');
    this.sharedDir = path.join(this.baseDir, 'shared');
    // 向量索引路径（可通过 VECTOR_INDEX_PATH 环境变量自定义）
    this.vectorIndexPath = process.env.VECTOR_INDEX_PATH ||
      path.join(this.sharedDir, '.vector-index.json');
  }

  /**
   * 检查当前 Agent 是否有写入权限
   */
  canWrite() {
    return ALLOWED_AGENTS.has(this.agentId);
  }

  // ==================== 路径管理 ====================

  getMemoryPath(layer, type = 'shared') {
    const dir = type === 'shared' ? this.sharedDir : path.join(this.baseDir, this.agentId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `${layer}.md`);
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

  /**
   * 查询团队记忆（支持关键词 + 多层）
   */
  async queryTeam(query, layers = null) {
    const allShared = await this.readAllShared(layers);
    const results = [];

    for (const [layer, entries] of Object.entries(allShared)) {
      for (const entry of entries) {
        const score = this._calcRelevance(query, entry.content);
        if (score > 0) {
          results.push({ ...entry, layer, score });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * 获取团队统计信息
   */
  async teamStats(layers = null) {
    const allShared = await this.readAllShared(layers);
    const stats = { totalEntries: 0, byLayer: {}, byAgent: {} };

    for (const [layer, entries] of Object.entries(allShared)) {
      stats.byLayer[layer] = entries.length;
      stats.totalEntries += entries.length;
      for (const entry of entries) {
        const agent = entry.agent || 'unknown';
        stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;
      }
    }
    return stats;
  }

  // ==================== 共享记忆写入 ====================

  /**
   * 写入共享记忆（所有 Agent 可见）
   */
  async writeShared(layer, content, meta = {}) {
    // 访问控制
    if (!ALLOWED_AGENTS.has(this.agentId)) {
      console.warn(`⚠️ Agent '${this.agentId}' 不在白名单，拒绝写入 shared 层`);
      return { error: 'ACCESS_DENIED', agent: this.agentId };
    }

    const filePath = this.getMemoryPath(layer, 'shared');

    if (!fs.existsSync(this.sharedDir)) {
      fs.mkdirSync(this.sharedDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const entryMeta = [
      `source: ${meta.source || this.agentId}`,
      `layer: ${layer}`,
      `timestamp: ${timestamp}`,
      `agent: ${this.agentId}`,
      `confidence: ${meta.confidence || 0.8}`,
      `tags: ${(meta.tags || []).join(',')}`,
    ].join('\n');

    const entryBlock = `---\n${entryMeta}\n---\n${content}\n`;
    const separator = fs.existsSync(filePath) ? '\n' : '';
    fs.appendFileSync(filePath, separator + entryBlock);

    await this._updateSharedIndex(layer, { content, timestamp, agent: this.agentId, ...meta });
    await this._updateVectorIndex(layer, { content, timestamp, agent: this.agentId });
    return { layer, content, agent: this.agentId, timestamp };
  }

  // ==================== 私有记忆读取 ====================

  async readPrivate(layer) {
    const filePath = this.getMemoryPath(layer, 'private');
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf8');
    return this._parseEntries(content, layer, 'private');
  }

  // ==================== 私有记忆写入 ====================

  async writePrivate(layer, content, meta = {}) {
    const filePath = this.getMemoryPath(layer, 'private');

    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const entryMeta = [
      `source: ${meta.source || this.agentId}`,
      `layer: ${layer}`,
      `timestamp: ${timestamp}`,
      `agent: ${this.agentId}`,
      `confidence: ${meta.confidence || 0.8}`,
      `tags: ${(meta.tags || []).join(',')}`,
    ].join('\n');

    const entryBlock = `---\n${entryMeta}\n---\n${content}\n`;
    const separator = fs.existsSync(filePath) ? '\n' : '';
    fs.appendFileSync(filePath, separator + entryBlock);

    await this._updateVectorIndex(layer, { content, timestamp, agent: this.agentId });
    return { layer, content, agent: this.agentId, timestamp };
  }

  // ==================== 工具方法 ====================

  /**
   * 解析记忆文件为条目数组
   * 
   * 文件格式：
   * ---
   * source: analyst
   * layer: observations
   * timestamp: 2026-04-19T14:16:26.019Z
   * agent: analyst
   * confidence: 0.8
   * tags: 竞彩
   * ---
   * 英超保级队主场强势，需重点关注
   * 
   * ---
   * source: analyst
   * ...
   */
  _parseEntries(content, layer, type) {
    // 状态机：SKIP_BLANKS → SEPARATOR → META → SEPARATOR → BODY → (SKIP_BLANKS 或结束)
    const entries = [];
    const lines = content.split('\n');
    const total = lines.length;

    if (total === 0) return entries;

    let pos = 0;
    let state = 'SEPARATOR';  // 文件开头先找 ---
    let meta = {};

    while (pos < total) {
      const line = lines[pos];
      const trimmed = line.trim();

      switch (state) {
        case 'SKIP_BLANKS':
          if (trimmed === '') {
            pos++;
          } else if (trimmed === '---') {
            state = 'SEPARATOR';
            pos++;
          } else {
            // 裸文本行（无 --- 前缀）→ 当作内容处理
            state = 'BODY';
          }
          break;

        case 'SEPARATOR':
          if (trimmed === '---') {
            pos++;
          } else if (trimmed === '') {
            // 只有 --- 行没有内容 → 跳过空行，继续检查下一个分隔符
            pos++;
          } else {
            // 进入元数据解析
            state = 'META';
          }
          break;

        case 'META': {
          meta = {};
          while (pos < total) {
            const lineInMeta = lines[pos];
            const trimmedInMeta = lineInMeta.trim();
            if (trimmedInMeta === '---') break;
            const colonIdx = lineInMeta.indexOf(':');
            if (colonIdx > 0) {
              const key = lineInMeta.substring(0, colonIdx).trim();
              const val = lineInMeta.substring(colonIdx + 1).trim();
              if (['source', 'layer', 'timestamp', 'agent', 'confidence', 'tags'].includes(key)) {
                meta[key] = val;
              }
            }
            pos++;
          }
          // 跳过结束 ---
          if (pos < total && lines[pos].trim() === '---') {
            pos++;
          }
          state = 'BODY';
          break;
        }

        case 'BODY': {
          const bodyLines = [];
          // 收集非空行作为 body
          while (pos < total) {
            const currLine = lines[pos];
            const currTrimmed = currLine.trim();
            if (currTrimmed === '---') {
              break;
            }
            if (currTrimmed !== '') {
              bodyLines.push(currLine);
            }
            pos++;
          }
          // 跳过结束 ---
          if (pos < total && lines[pos].trim() === '---') {
            pos++;
          }

          // 将 body 合并成文本
          let text = bodyLines.join('\n').trim();

          // 解析 tags（容错：空或格式异常 → []）
          let tags = [];
          if (meta.tags && meta.tags.trim() !== '') {
            try {
              tags = meta.tags.split(',').map(t => t.trim()).filter(t => t && t.length > 0);
            } catch (e) {
              tags = [];
            }
          }

          // 解析 timestamp（容错：格式错误 → null）
          let timestamp = null;
          if (meta.timestamp) {
            try {
              const d = new Date(meta.timestamp);
              if (!isNaN(d.getTime())) timestamp = meta.timestamp;
            } catch (e) {
              timestamp = null;
            }
          }

          // 解析 confidence（容错：非数字 → 0.8）
          let confidence = 0.8;
          if (meta.confidence !== undefined) {
            const parsed = parseFloat(meta.confidence);
            if (!isNaN(parsed) && isFinite(parsed)) {
              confidence = parsed;
            }
          }

          // 只有非空内容才创建 entry
          if (text && text.length > 0) {
            entries.push({
              content: text,
              layer: layer,
              type: type,
              agent: meta.agent || null,
              timestamp: timestamp,
              confidence: confidence,
              tags: tags,
            });
          }

          state = 'SKIP_BLANKS';
          break;
        }
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
      if (qw.length > 3 && content.includes(qw)) score += 0.5;
    }
    return score;
  }

  async _updateSharedIndex(layer, entry) {
    const indexPath = path.join(this.sharedDir, '.index.json');
    let index = {};

    if (fs.existsSync(indexPath)) {
      try {
        index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      } catch (e) {}
    }

    if (!index[layer]) index[layer] = [];
    index[layer].unshift({
      timestamp: entry.timestamp,
      agent: entry.agent,
      preview: entry.content.substring(0, 50),
    });

    index[layer] = index[layer].slice(0, 100);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  // ==================== 向量语义检索 ====================

  /**
   * 获取文本的向量嵌入
   * @param {string} text - 输入文本
   * @returns {Promise<number[]>} 1024维向量
   */
  async getEmbedding(text) {
    const apiKey = process.env.SILICONFLOW_API_KEY || 'sk-hopwulmvayaotukjhclxarqpsbekmxzlmwrsmiztqxlymwqh';
    const truncatedText = text.substring(0, 512);

    try {
      const response = await fetch('https://api.siliconflow.cn/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'BAAI/bge-m3',
          input: truncatedText
        })
      });

      const data = await response.json();
      if (data.data && data.data[0] && data.data[0].embedding) {
        return data.data[0].embedding;
      }
      throw new Error('Invalid embedding response');
    } catch (error) {
      console.error('getEmbedding error:', error.message);
      throw error;
    }
  }

  /**
   * 计算余弦相似度
   * @param {number[]} a - 向量 A
   * @param {number[]} b - 向量 B
   * @returns {number} 相似度 [-1, 1]
   */
  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  /**
   * 读取向量索引文件
   * @returns {object|null} 向量索引对象
   */
  _loadVectorIndex() {
    const indexPath = this.vectorIndexPath;
    if (!fs.existsSync(indexPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(indexPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('_loadVectorIndex error:', error.message);
      return null;
    }
  }

  /**
   * 写入向量索引文件
   * @param {object} index - 向量索引对象
   */
  _saveVectorIndex(index) {
    const indexPath = this.vectorIndexPath;
    if (!fs.existsSync(this.sharedDir)) {
      fs.mkdirSync(this.sharedDir, { recursive: true });
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * 生成内容的唯一 ID (SHA1)
   * @param {string} content - 内容文本
   * @returns {string} SHA1 哈希
   */
  _generateContentId(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  /**
   * 更新向量索引（追加新条目）
   * @param {string} layer - 层名称
   * @param {object} entry - 条目内容
   */
  async _updateVectorIndex(layer, entry) {
    try {
      const index = this._loadVectorIndex() || {
        embedding_model: 'BAAI/bge-m3',
        dimensions: 1024,
        entries: []
      };

      const contentId = this._generateContentId(entry.content);
      const embedding = await this.getEmbedding(entry.content);

      const vectorEntry = {
        id: contentId,
        layer: layer,
        agent: this.agentId,
        content: entry.content,
        embedding: embedding,
        timestamp: entry.timestamp || new Date().toISOString()
      };

      // 检查是否已存在（避免重复）
      const exists = index.entries.some(e => e.id === contentId);
      if (!exists) {
        index.entries.push(vectorEntry);
        this._saveVectorIndex(index);
      }
    } catch (error) {
      console.error('_updateVectorIndex error:', error.message);
      // 不抛出异常，避免影响写入操作
    }
  }

  /**
   * 清理向量索引：移除已归档的条目
   * 比对当前各层记忆文件，只保留还在文件里的条目
   */
  async cleanVectorIndex() {
    const index = this._loadVectorIndex();
    if (!index || !index.entries) return { cleaned: 0 };

    const layers = ['mentalModels', 'observations', 'worldFacts', 'experiences'];
    const validIds = new Set();

    for (const layer of layers) {
      const entries = await this.readShared(layer);
      for (const entry of entries) {
        validIds.add(this._generateContentId(entry.content));
      }
    }

    const before = index.entries.length;
    index.entries = index.entries.filter(e => validIds.has(e.id));
    const after = index.entries.length;
    const cleaned = before - after;

    if (cleaned > 0) {
      this._saveVectorIndex(index);
      console.log(`  清理了 ${cleaned} 条过期索引（${before}→${after}）`);
    }
    return { cleaned, remaining: after };
  }

  /**
   * 语义向量搜索
   * @param {string} query - 查询文本
   * @param {string[]} layers - 要搜索的层（可选）
   * @param {number} topK - 返回条数
   * @returns {Promise<Array>} 语义相似的结果
   */
  async querySemantic(query, layers = null, topK = 5) {
    const index = this._loadVectorIndex();

    // 如果向量索引不存在，回退到关键词搜索
    if (!index || !index.entries || index.entries.length === 0) {
      console.log('Vector index not found, falling back to keyword search');
      return await this.queryTeam(query, layers);
    }

    try {
      const queryEmbedding = await this.getEmbedding(query);
      const results = [];

      for (const entry of index.entries) {
        // 过滤层
        if (layers && layers.length > 0 && !layers.includes(entry.layer)) {
          continue;
        }

        const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
        if (similarity > 0) {
          results.push({
            ...entry,
            score: similarity
          });
        }
      }

      // 按相似度排序，返回 topK
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, topK);
    } catch (error) {
      console.error('querySemantic error:', error.message);
      // 出错时回退到关键词搜索
      return await this.queryTeam(query, layers);
    }
  }

  /**
   * 为指定层建立向量索引
   * @param {string[]} layers - 要建立索引的层
   * @returns {Promise<object>} 建立索引的统计信息
   */
  async buildVectorIndex(layers = null) {
    const targetLayers = layers || ['mentalModels', 'worldFacts', 'observations', 'experiences'];
    const stats = {
      totalEntries: 0,
      entriesIndexed: 0,
      errors: [],
      layers: {}
    };

    const index = this._loadVectorIndex() || {
      embedding_model: 'BAAI/bge-m3',
      dimensions: 1024,
      entries: []
    };

    for (const layer of targetLayers) {
      try {
        const entries = await this.readShared(layer);
        stats.layers[layer] = { total: entries.length, indexed: 0 };
        stats.totalEntries += entries.length;

        for (const entry of entries) {
          const contentId = this._generateContentId(entry.content);

          // 检查是否已存在
          const exists = index.entries.some(e => e.id === contentId);
          if (exists) {
            continue;
          }

          try {
            const embedding = await this.getEmbedding(entry.content);

            index.entries.push({
              id: contentId,
              layer: layer,
              agent: entry.agent || this.agentId,
              content: entry.content,
              embedding: embedding,
              timestamp: entry.timestamp || new Date().toISOString()
            });

            stats.layers[layer].indexed++;
            stats.entriesIndexed++;
          } catch (error) {
            stats.errors.push({
              layer,
              content: entry.content.substring(0, 50),
              error: error.message
            });
          }
        }
      } catch (error) {
        stats.errors.push({
          layer,
          error: `Failed to read layer: ${error.message}`
        });
      }
    }

    this._saveVectorIndex(index);
    return stats;
  }
}

module.exports = { AgentContext };
