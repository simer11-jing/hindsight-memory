/**
 * 关键词搜索
 */

const { SearchResult } = require('../memory-entry');

/**
 * 关键词搜索适配器
 */
class KeywordSearch {
  constructor(options = {}) {
    this.caseSensitive = options.caseSensitive || false;
    this.wholeWord = options.wholeWord || false;
  }
  
  /**
   * 搜索
   */
  search(entries, query, options = {}) {
    const { limit = 10, layer = 'all' } = options;
    
    const results = [];
    const queryLower = query.toLowerCase();
    let pattern = query;
    
    if (this.wholeWord) {
      pattern = `\\b${query}\\b`;
    }
    
    const regex = new RegExp(
      this.caseSensitive ? pattern : pattern,
      this.caseSensitive ? 'g' : 'gi'
    );
    
    for (const entry of entries) {
      // 按层级过滤
      if (layer !== 'all' && entry.layer !== layer) {
        continue;
      }
      
      const content = entry.content;
      let match;
      let matchCount = 0;
      
      // 统计匹配次数
      while ((match = regex.exec(content)) !== null) {
        matchCount++;
      }
      
      if (matchCount > 0) {
        // 计算分数：匹配次数 / 总长度
        const score = matchCount / content.length * 100;
        
        results.push(new SearchResult(entry, score, 'keyword'));
      }
    }
    
    // 按分数排序
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, limit);
  }
  
  /**
   * 高亮匹配
   */
  highlight(text, query) {
    const pattern = new RegExp(`(${query})`, 'gi');
    return text.replace(pattern, '[$1]');
  }
}

/**
 * Boyer-Moore 搜索（简单实现）
 */
class BoyerMooreSearch extends KeywordSearch {
  constructor() {
    super();
    this.cache = new Map();
  }
  
  /**
   * 构建跳转表
   */
  buildJumpTable(pattern) {
    const table = {};
    const len = pattern.length;
    
    for (let i = 0; i < len; i++) {
      table[pattern[i].toLowerCase()] = len - i - 1;
    }
    
    return table;
  }
  
  /**
   * 搜索
   */
  search(entries, query, options = {}) {
    // 简化：回退到正则
    return super.search(entries, query, options);
  }
}

module.exports = {
  KeywordSearch,
  BoyerMooreSearch
};