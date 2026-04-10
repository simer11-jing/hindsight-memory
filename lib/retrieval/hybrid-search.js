/**
 * HybridSearch - Combines keyword and semantic search
 */

const { KeywordSearch } = require('./keyword-search');
const { SemanticSearch } = require('./semantic-search');

class HybridSearch {
  constructor(options = {}) {
    this.keywordWeight = options.keywordWeight || 0.6;
    this.semanticWeight = options.semanticWeight || 0.4;
    this.keywordSearch = new KeywordSearch(options.keyword);
    this.semanticSearch = new SemanticSearch(options.semantic);
  }

  /**
   * Search entries using both keyword and semantic signals
   */
  search(entries, query) {
    const keywordResults = this.keywordSearch.search(entries, query);
    const semanticResults = this.semanticSearch.search(entries, query);

    const scores = new Map();

    // Normalize keyword scores
    const maxKeyword = Math.max(...keywordResults.map(r => r.score), 0.0001);
    for (const { entry, score } of keywordResults) {
      scores.set(entry.id, {
        entry,
        keyword: score / maxKeyword,
        semantic: 0
      });
    }

    // Normalize semantic scores
    const maxSemantic = Math.max(...semanticResults.map(r => r.score), 0.0001);
    for (const { entry, score } of semanticResults) {
      if (scores.has(entry.id)) {
        scores.get(entry.id).semantic = score / maxSemantic;
      } else {
        scores.set(entry.id, {
          entry,
          keyword: 0,
          semantic: score / maxSemantic
        });
      }
    }

    // Combine scores
    const results = [];
    for (const { entry, keyword, semantic } of scores.values()) {
      const combined = (keyword * this.keywordWeight) + (semantic * this.semanticWeight);
      results.push({ entry, score: combined, keyword, semantic });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Re-index semantic vectors
   */
  reindex(entries) {
    this.semanticSearch.index(entries);
  }
}

module.exports = { HybridSearch };
