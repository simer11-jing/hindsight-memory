/**
 * 语义搜索 - 支持本地 + 云端(自定义API)
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
 * 本地模型
 */
class LocalEmbedder {
  constructor(options = {}) {
    this.model = options.model || 'Xenova/all-MiniLM-L6-v2';
    this.device = options.device || 'cpu';
    this.pipeline = null;
  }
  
  async init() {
    if (this.pipeline) return;
    console.log(`⏳ 加载本地模型: ${this.model}`);
    this.pipeline = await pipeline('feature-extraction', this.model, { device: this.device });
    console.log('✅ 模型加载完成');
  }
  
  async embed(text) {
    await this.init();
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
 * 自定义 API Embedding (支持任意 OpenAI 兼容接口)
 */
class CustomAPIEmbedder {
  constructor(options = {}) {
    this.apiKey = options.apiKey || '';
    this.baseURL = options.baseURL || 'https://api.openai.com/v1';
    this.model = options.model || 'text-embedding-3-small';
    this.dimensions = options.dimensions || 1536;
  }
  
  async embed(text) {
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
      const err = await response.text();
      throw new Error(`API 错误 ${response.status}: ${err}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async embedBatch(texts) {
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
    return !!this.apiKey && !!this.baseURL;
  }
}

/**
 * OpenAI Embedding
 */
class OpenAIEmbedder extends CustomAPIEmbedder {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey || process.env.OPENAI_API_KEY,
      baseURL: options.baseURL || 'https://api.openai.com/v1',
      model: options.model || 'text-embedding-3-small',
      dimensions: options.dimensions || 1536
    });
  }
}

/**
 * 统一 Embedder
 */
class Embedder {
  constructor(options = {}) {
    this.config = options.config || (ConfigManager ? new ConfigManager() : null);
    this.embedder = null;
  }
  
  async init() {
    const type = this.config?.get('vector.type') || 'local';
    
    if (type === 'local') {
      this.embedder = new LocalEmbedder({
        model: this.config?.get('vector.model'),
        device: this.config?.get('vector.device')
      });
    } else {
      // 云端：支持自定义 API
      const customURL = this.config?.get('vector.cloudBaseURL');
      const apiKey = this.config?.get('vector.cloudApiKey') || process.env.OPENAI_API_KEY;
      const model = this.config?.get('vector.cloudModel') || 'text-embedding-3-small';
      const dimensions = this.config?.get('vector.dimensions') || 1536;
      
      if (customURL) {
        // 自定义 API
        this.embedder = new CustomAPIEmbedder({
          baseURL: customURL,
          apiKey: apiKey,
          model: model,
          dimensions: dimensions
        });
      } else {
        // 默认 OpenAI
        this.embedder = new OpenAIEmbedder({
          apiKey: apiKey,
          model: model,
          dimensions: dimensions
        });
      }
    }
    
    await this.embedder.init?.();
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
 * 语义搜索
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
  
  async init() { await this.semantic.init(); }
  
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
    return fused.slice(0, options.limit || 10).map(item => new SearchResult(item.entry, item.score, Array.from(item.sources).join('+')));
  }
}

module.exports = { SemanticSearch, HybridSearch, LocalEmbedder, CustomAPIEmbedder, OpenAIEmbedder, Embedder };
