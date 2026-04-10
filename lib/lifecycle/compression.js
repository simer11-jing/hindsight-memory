/**
 * Compression - Automatic compression for large or old memories
 */

class Compression {
  constructor(options = {}) {
    this.thresholdChars = options.thresholdChars || 2000;
    this.thresholdAgeDays = options.thresholdAgeDays || 30;
    this.compressionRatio = options.compressionRatio || 0.5;
    this.onCompress = options.onCompress || null;
  }

  /**
   * Check if an entry should be compressed
   */
  shouldCompress(entry) {
    const contentLength = entry.content.length;
    const ageMs = Date.now() - new Date(entry.metadata.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    return contentLength > this.thresholdChars || 
           (ageDays > this.thresholdAgeDays && contentLength > 500);
  }

  /**
   * Compress an entry's content
   */
  compress(entry) {
    const originalContent = entry.content;
    const compressedContent = this._compressContent(originalContent);
    
    const compressedEntry = {
      ...entry,
      content: compressedContent,
      metadata: {
        ...entry.metadata,
        compressed: true,
        originalLength: originalContent.length,
        compressedLength: compressedContent.length,
        compressedAt: new Date().toISOString()
      }
    };

    if (this.onCompress) {
      this.onCompress(entry, compressedEntry);
    }

    return compressedEntry;
  }

  /**
   * Simple compression: extract key sentences + summary
   */
  _compressContent(content) {
    // Extract sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    
    if (sentences.length <= 3) {
      return content; // Too short to compress
    }

    // Keep first sentence (often contains context)
    // Keep sentences with keywords (names, dates, actions)
    // Summarize the rest
    const keepCount = Math.max(1, Math.floor(sentences.length * this.compressionRatio));
    const importantSentences = [];
    const keywords = this._extractKeywords(content);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      const score = this._scoreSentence(sentence, keywords, i, sentences.length);
      importantSentences.push({ sentence, score, index: i });
    }

    // Sort by score and take top sentences
    importantSentences.sort((a, b) => b.score - a.score);
    const topSentences = importantSentences
      .slice(0, keepCount)
      .sort((a, b) => a.index - b.index);

    return topSentences.map(s => s.sentence).join(' ');
  }

  _extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    const freq = new Map();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  _scoreSentence(sentence, keywords, index, total) {
    let score = 0;
    const lower = sentence.toLowerCase();

    // Position bonus (first and last sentences often important)
    if (index === 0) score += 5;
    if (index === total - 1) score += 3;

    // Keyword matches
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += 2;
      }
    }

    // Length preference (not too short, not too long)
    const len = sentence.length;
    if (len > 20 && len < 200) {
      score += 1;
    }

    // Entity indicators (names, dates)
    if (/[A-Z][a-z]+/.test(sentence)) score += 1;
    if (/\d{4}/.test(sentence)) score += 1;

    return score;
  }

  /**
   * Run compression check on all entries
   */
  async process(store) {
    const entries = await store.list();
    const compressed = [];

    for (const entry of entries) {
      if (this.shouldCompress(entry) && !entry.metadata.compressed) {
        const compressedEntry = this.compress(entry);
        await store.update(entry.id, compressedEntry);
        compressed.push(entry.id);
      }
    }

    return { compressed: compressed.length, ids: compressed };
  }
}

module.exports = { Compression };
