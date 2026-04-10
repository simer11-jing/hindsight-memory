/**
 * SemanticSearch - Vector-based semantic memory retrieval
 * Optional: uses basic TF-IDF-like cosine similarity without external deps
 */

class SemanticSearch {
  constructor(options = {}) {
    this.topK = options.topK || 10;
    this.minScore = options.minScore || 0.1;
    this.documentVectors = new Map();
    this.idfCache = new Map();
  }

  /**
   * Build vector index from entries
   */
  index(entries) {
    this.documentVectors.clear();
    this.idfCache.clear();

    const corpus = entries.map(e => this._tokenize(e.content));
    const idf = this._computeIDF(corpus);

    for (let i = 0; i < entries.length; i++) {
      const vector = this._computeTFIDF(corpus[i], idf);
      this.documentVectors.set(entries[i].id, vector);
    }

    this.idfCache = idf;
  }

  /**
   * Search by semantic similarity
   */
  search(entries, query) {
    if (!query || !query.trim()) {
      return entries.map(entry => ({ entry, score: 0 }));
    }

    // Auto-index if needed
    if (this.documentVectors.size === 0) {
      this.index(entries);
    }

    const queryTokens = this._tokenize(query);
    const queryVector = this._computeTFIDF(queryTokens, this.idfCache);

    const results = [];
    for (const entry of entries) {
      const docVector = this.documentVectors.get(entry.id);
      if (!docVector) continue;

      const score = this._cosineSimilarity(queryVector, docVector);
      if (score >= this.minScore) {
        results.push({ entry, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, this.topK);
  }

  _tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  _computeIDF(corpus) {
    const docFreq = new Map();
    const N = corpus.length;

    for (const doc of corpus) {
      const seen = new Set(doc);
      for (const term of seen) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      }
    }

    const idf = new Map();
    for (const [term, df] of docFreq) {
      idf.set(term, Math.log(N / (df + 1)) + 1);
    }
    return idf;
  }

  _computeTFIDF(tokens, idf) {
    const tf = new Map();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    const vector = new Map();
    for (const [term, count] of tf) {
      const idfValue = idf.get(term) || 1.0;
      vector.set(term, count * idfValue);
    }

    return this._normalizeVector(vector);
  }

  _normalizeVector(vector) {
    let sum = 0;
    for (const v of vector.values()) {
      sum += v * v;
    }
    const magnitude = Math.sqrt(sum) || 1;

    const normalized = new Map();
    for (const [k, v] of vector) {
      normalized.set(k, v / magnitude);
    }
    return normalized;
  }

  _cosineSimilarity(v1, v2) {
    let dotProduct = 0;
    for (const [term, val] of v1) {
      if (v2.has(term)) {
        dotProduct += val * v2.get(term);
      }
    }
    return dotProduct;
  }
}

module.exports = { SemanticSearch };
