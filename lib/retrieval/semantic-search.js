/**
 * 语义搜索 - 向量检索（支持配置）
 */

const { pipeline } = require('@xenova/transformers');
const { SearchResult } = require('../memory-entry');

let ConfigManager, EMBEDDING_MODELS;
try {
  const config = require('../config');
  ConfigManager = config.ConfigManager;
  EMBEDDING_MODELS = config.EMBEDDING_MODELS;
} catch (e) {
  ConfigManager = null;
  EMBEDDING_MODELS = {};
}

class SemanticSearch {
  constructor(options = {}) {
    // 优先使用传入的选项，否则从配置读取
    this.config = options.config || (ConfigManager ? new ConfigManager() : null);
    
    this.model = options.model || (this.config?.get('vector.model') || 'Xenova/all-MiniLM-L6-v2');
    this.dimensions = options.dimensions || (this.config?.get('vector.dimensions') || 384);
    this.device = options.device || (this.config?.get('vector.device') || 'cpu');
    this.threshold = options.threshold || (this.config?.get('vector.threshold') || 0.7);
    
    this.pipeline = null;
    this.initialized = false;
  }
  
  async init() {
    if (this.initialized) return;
    console.log(`⏳ 加载模型: ${this.model} (${this.dimensions}维)`);
    
    try {
      this.pipeline = await pipeline('feature-extraction', this.model, { device: this.device });
      this.initialized = true;
      console.log('✅ 模型加载完成');
    } catch (error) {
      throw new Error(`模型加载失败: ${error.message}`);
    }
  }
  
  async embed(text) {
    if (!this.initialized) await this.init();
    const result = await this.pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }
  
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }
  
  async search(entries, query, options = {}) {
    if (!this.initialized) await this.init();
    
    const queryVector = await this.embed(query);
    const limit = options.limit || 10;
    const layer = options.layer || 'all';
    const threshold = options.threshold || this.threshold;
    
    const results = [];
    for (const entry of entries) {
      if (layer !== 'all' && entry.layer !== layer) continue;
      if (!entry.embedding) continue;
      
      const similarity = this.cosineSimilarity(queryVector, entry.embedding);
      if (similarity >= threshold) {
        results.push(new SearchResult(entry, similarity, 'semantic'));
      }
    }
    
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  
  async indexEntries(entries) {
    if (!this.initialized) await this.init();
    
    console.log(`⏳ 为 ${entries.length} 条记忆生成向量...`);
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].embedding) {
        entries[i].embedding = await this.embed(entries[i].content);
        if ((i + 1) % 10 === 0) console.log(`  进度: ${i + 1}/${entries.length}`);
      }
    }
    console.log('✅ 向量索引完成');
    return entries;
  }
  
  isAvailable() {
    try { require('@xenova/transformers'); return true; } 
    catch (e) { return false; }
  }
  
  getInfo() {
    return {
      model: this.model,
      dimensions: this.dimensions,
      device: this.device,
      initialized: this.initialized
    };
  }
}

class HybridSearch {
  constructor(options = {}) {
    this.keyword = options.keyword || require('./keyword-search');
    this.semantic = options.semantic || new SemanticSearch(options);
    this.rrfK = options.rrfK || (options.config?.get('retrieval.hybridRrfK') || 60);
  }
  
  async init() {
    await this.semantic.init();
  }
  
  rrfFusion(resultsBySource) {
    const scores = {};
    for (const [source, results] of Object.entries(resultsBySource)) {
      if (!results?.length) continue;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const id = r.entry.id;
        if (!scores[id]) scores[id] = { id, entry: r.entry, score: 0, sources: new Set() };
        scores[id].score += 1 / (this.rrfK + i + 1);
        scores[id].sources.add(source);
      }
    }
    return Object.values(scores).sort((a, b) => b.score - a.score);
  }
  
  async search(entries, query, options = {}) {
    const results = {};
    
    await Promise.all([
      this.keyword.search(entries, query, options).then(r => results.keyword = r),
      this.semantic.search(entries, query, options).then(r => results.semantic = r).catch(() => results.semantic = [])
    ]);
    
    const fused = this.rrfFusion(results);
    return fused.slice(0, options.limit || 10).map(item => 
      new SearchResult(item.entry, item.score, Array.from(item.sources).join('+'))
    );
  }
  
  async indexEntries(entries) {
    return this.semantic.indexEntries(entries);
  }
}

module.exports = { SemanticSearch, HybridSearch };
