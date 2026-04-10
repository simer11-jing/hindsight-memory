/**
 * 语义搜索 - 向量检索
 * 使用 @xenova/transformers 生成嵌入向量
 */

const { pipeline } = require('@xenova/transformers');
const { SearchResult } = require('../memory-entry');

/**
 * 语义搜索适配器
 */
class SemanticSearch {
  constructor(options = {}) {
    this.model = options.model || 'Xenova/all-MiniLM-L6-v2';
    this.dimensions = options.dimensions || 384;
    this.device = options.device || 'cpu';
    this.pipeline = null;
    this.initialized = false;
  }
  
  /**
   * 初始化模型
   */
  async init() {
    if (this.initialized) return;
    
    console.log(`⏳ 加载语义模型: ${this.model}`);
    
    try {
      this.pipeline = await pipeline(
        'feature-extraction',
        this.model,
        { device: this.device }
      );
      this.initialized = true;
      console.log('✅ 语义模型加载完成');
    } catch (error) {
      console.error('❌ 模型加载失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 生成嵌入向量
   */
  async embed(text) {
    if (!this.initialized) {
      await this.init();
    }
    
    const result = await this.pipeline(text, {
      pooling: 'mean',
      normalize: true
    });
    
    return Array.from(result.data);
  }
  
  /**
   * 批量生成嵌入
   */
  async embedBatch(texts) {
    const embeddings = [];
    
    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }
  
  /**
   * 计算余弦相似度
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * 搜索
   */
  async search(entries, query, options = {}) {
    const { 
      limit = 10, 
      layer = 'all',
      threshold = 0.7 
    } = options;
    
    if (!this.initialized) {
      await this.init();
    }
    
    // 生成查询向量
    const queryVector = await this.embed(query);
    
    const results = [];
    
    for (const entry of entries) {
      // 按层级过滤
      if (layer !== 'all' && entry.layer !== layer) {
        continue;
      }
      
      // 如果没有预计算的向量，就跳过（关键词搜索会捕获）
      if (!entry.embedding) {
        continue;
      }
      
      // 计算相似度
      const similarity = this.cosineSimilarity(queryVector, entry.embedding);
      
      if (similarity >= threshold) {
        results.push(new SearchResult(entry, similarity, 'semantic'));
      }
    }
    
    // 按相似度排序
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, limit);
  }
  
  /**
   * 为条目添加向量（批量）
   */
  async indexEntries(entries) {
    if (!this.initialized) {
      await this.init();
    }
    
    console.log(`⏳ 正在为 ${entries.length} 条记忆生成向量...`);
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      if (!entry.embedding) {
        entry.embedding = await this.embed(entry.content);
        
        // 进度显示
        if ((i + 1) % 10 === 0) {
          console.log(`  进度: ${i + 1}/${entries.length}`);
        }
      }
    }
    
    console.log('✅ 向量索引完成');
    return entries;
  }
  
  /**
   * 检查是否支持
   */
  isAvailable() {
    try {
      require('@xenova/transformers');
      return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * 混合搜索 - 关键词 + 语义
 */
class HybridSearch {
  constructor(options = {}) {
    this.keyword = options.keyword || require('./keyword-search');
    this.semantic = options.semantic || new SemanticSearch(options);
    this.rrfK = options.rrfK || 60;
    this.enabled = {
      keyword: true,
      semantic: true
    };
  }
  
  /**
   * 初始化
   */
  async init() {
    if (this.enabled.semantic) {
      await this.semantic.init();
    }
  }
  
  /**
   * RRF 融合
   */
  rrfFusion(resultsBySource) {
    const scores = {};
    
    for (const [source, results] of Object.entries(resultsBySource)) {
      if (!results || results.length === 0) continue;
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const id = result.entry.id;
        
        // RRF 公式: 1 / (k + rank)
        const rrfScore = 1 / (this.rrfK + i + 1);
        
        scores[id] = scores[id] || {
          id,
          entry: result.entry,
          score: 0,
          sources: new Set()
        };
        
        scores[id].score += rrfScore;
        scores[id].sources.add(source);
      }
    }
    
    // 转换为数组并排序
    return Object.values(scores)
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        ...item,
        matchType: Array.from(item.sources).join('+')
      }));
  }
  
  /**
   * 搜索
   */
  async search(entries, query, options = {}) {
    const results = {};
    
    // 并行执行两种搜索
    const promises = [];
    
    if (this.enabled.keyword) {
      promises.push(
        this.keyword.search(entries, query, options)
          .then(r => { results.keyword = r; })
      );
    }
    
    if (this.enabled.semantic) {
      promises.push(
        this.semantic.search(entries, query, options)
          .then(r => { results.semantic = r; })
          .catch(e => { 
            console.warn('⚠️ 语义搜索失败:', e.message);
            results.semantic = [];
          })
      );
    }
    
    await Promise.all(promises);
    
    // 融合结果
    const fused = this.rrfFusion(results);
    
    // 限制结果数量
    return fused.slice(0, options.limit || 10).map(item => 
      new SearchResult(item.entry, item.score, item.matchType)
    );
  }
  
  /**
   * 索引所有条目
   */
  async indexEntries(entries) {
    if (this.enabled.semantic) {
      return await this.semantic.indexEntries(entries);
    }
    return entries;
  }
}

module.exports = {
  SemanticSearch,
  HybridSearch
};