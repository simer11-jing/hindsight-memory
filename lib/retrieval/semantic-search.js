/**
 * 语义搜索 - 支持本地 + 云端向量模型
 */

const { pipeline } = require('@xenova/transformers');
const { SearchResult } = require('../memory-entry');

let ConfigManager;
try {
  const config = require('../lib/config');
  ConfigManager = config.ConfigManager;
} catch (e) {
  ConfigManager = null;
}

/**
 * 本地模型搜索
 */
class LocalEmbedder {
  constructor(options = {}) {
    this.model = options.model || 'Xenova/all-MiniLM-L6-v2';
    this.dimensions = options.dimensions || 384;
    this.device = options.device || 'cpu';
    this.pipeline = null;
    this.initialized = false;
  }
  
  async init() {
    if (this.initialized) return;
    console.log(`⏳ 加载本地模型: ${this.model}`);
    this.pipeline = await pipeline('feature-extraction', this.model, { device: this.device });
    this.initialized = true;
    console.log('✅ 本地模型加载完成');
  }
  
  async embed(text) {
    if (!this.initialized) await this.init();
    const result = await this.pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }
  
  async embedBatch(texts) {
    const results = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
  
  isAvailable() {
    try { require('@xenova/transformers'); return true; } catch { return false; }
  }
}

/**
 * OpenAI Embedding
 */
class OpenAIEmbedder {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.model = options.model || 'text-embedding-3-small';
    this.dimensions = options.dimensions || 1536;
    this.baseURL = options.baseURL || 'https://api.openai.com/v1';
  }
  
  async embed(text) {
    if (!this.apiKey) throw new Error('OpenAI API Key 未配置');
    
    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
        dimensions: this.dimensions
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API 错误: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async embedBatch(texts) {
    if (!this.apiKey) throw new Error('OpenAI API Key 未配置');
    
    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        dimensions: this.dimensions
      })
    });
    
    const data = await response.json();
    return data.data.map(d => d.embedding);
  }
  
  isAvailable() {
    return !!this.apiKey;
  }
  
  getDimensions() {
    const dims = { 'text-embedding-3-small': 1536, 'text-embedding-3-large': 3072, 'text-embedding-ada-002': 1536 };
    return dims[this.model] || this.dimensions;
  }
}

/**
 * Cohere Embedding
 */
class CohereEmbedder {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.COHERE_API_KEY;
    this.model = options.model || 'embed-english-v3.0';
  }
  
  async embed(text) {
    if (!this.apiKey) throw new Error('Cohere API Key 未配置');
    
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        texts: [text],
        model: this.model,
        input_type: 'search_document'
      })
    });
    
    const data = await response.json();
    return data.embeddings[0];
  }
  
  async embedBatch(texts) {
    if (!this.apiKey) throw new Error('Cohere API Key 未配置');
    
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        texts: texts,
        model: this.model,
        input_type: 'search_document'
      })
    });
    
    const data = await response.json();
    return data.embeddings;
  }
  
  isAvailable() {
    return !!this.apiKey;
  }
}

/**
 * 云端 Embedding 工厂
 */
class CloudEmbedder {
  constructor(provider, options = {}) {
    this.provider = provider;
    this.embedder = null;
    this.options = options;
  }
  
  static create(provider, options = {}) {
    switch (provider) {
      case 'openai':
        return new OpenAIEmbedder(options);
      case 'cohere':
        return new CohereEmbedder(options);
      default:
        throw new Error(`未知云端 provider: ${provider}`);
    }
  }
}

/**
 * 统一的 Embedding 接口
 */
class Embedder {
  constructor(options = {}) {
    this.config = options.config || (ConfigManager ? new ConfigManager() : null);
    this.type = options.type || (this.config?.get('vector.type') || 'local');
    this.local = null;
    this.cloud = null;
    this.embedder = null;
  }
  
  async init() {
    const isLocal = this.type === 'local';
    
    if (isLocal) {
      this.embedder = new LocalEmbedder({
        model: this.config?.get('vector.model'),
        device: this.config?.get('vector.device')
      });
    } else {
      const provider = this.config?.get('vector.cloudProvider') || 'openai';
      this.embedder = CloudEmbedder.create(provider, {
        apiKey: this.config?.get('vector.cloudApiKey') || process.env.OPENAI_API_KEY,
        model: this.config?.get('vector.cloudModel'),
        baseURL: this.config?.get('vector.cloudBaseURL')
      });
    }
    
    await this.embedder.init?.();
    return this;
  }
  
  async embed(text) {
    if (!this.embedder) await this.init();
    return this.embedder.embed(text);
  }
  
  async embedBatch(texts) {
    if (!this.embedder) await this.init();
    return this.embedder.embedBatch(texts);
  }
  
  isAvailable() {
    return this.embedder?.isAvailable?.() || false;
  }
}

/**
 * 语义搜索核心
 */
class SemanticSearch {
  constructor(options = {}) {
    this.config = options.config || (ConfigManager ? new ConfigManager() : null);
    this.threshold = options.threshold || (this.config?.get('vector.threshold') || 0.7);
    this.embedder = null;
    this.initialized = false;
  }
  
  async init() {
    if (this.initialized) return;
    this.embedder = new Embedder({ config: this.config });
    await this.embedder.init();
    this.initialized = true;
    console.log('✅ 语义搜索初始化完成');
  }
  
  async embed(text) {
    if (!this.initialized) await this.init();
    return this.embedder.embed(text);
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
}

class HybridSearch {
  constructor(options = {}) {
    this.keyword = options.keyword || require('./keyword-search');
    this.semantic = options.semantic || new SemanticSearch(options);
    this.rrfK = options.rrfK || 60;
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
}

module.exports = { 
  SemanticSearch, 
  HybridSearch,
  LocalEmbedder,
  OpenAIEmbedder,
  CohereEmbedder,
  Embedder
};