#!/usr/bin/env node
/**
 * Semantic Search Fallback
 * 当 embedding API 不可用时自动降级到 FTS5 关键词搜索
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const FTS_SCRIPT = path.join(BASE_DIR, 'scripts', 'memory-fts.js');
const KEYWORD_SCRIPT = path.join(BASE_DIR, 'scripts', 'memory-tempr.js');

async function semanticSearch(query, topK = 10) {
  // 1. 尝试 embedding
  try {
    const embUrl = process.env.EMBEDDING_URL || 'http://192.168.50.2:3000/v1/embeddings';
    const embKey = process.env.EMBEDDING_KEY || '';
    if (!embKey) throw new Error('no embedding key');
    const result = execSync(`curl -s --max-time 8 "${embUrl}" -H "Authorization: Bearer ${embKey}" -H "Content-Type: application/json" -d '${JSON.stringify({model:'text-embedding-3-small',input:query})}'`, {encoding:'utf-8'});
    const d = JSON.parse(result);
    if (d.error) throw new Error(d.error.message);
    const emb = d.data?.[0]?.embedding;
    if (!emb) throw new Error('no embedding returned');
    // 有 embedding 就走 hybrid 检索
    console.log(`[semantic] embedding ok, dim=${emb.length}, running hybrid...`);
    execSync(`node ${path.join(BASE_DIR, 'scripts', 'memory-search.js')} "${query}" --limit ${topK}`, {stdio:'inherit'});
    return;
  } catch (e) {
    console.log(`[semantic] embedding failed: ${e.message}`);
  }

  // 2. Fallback 1: FTS5 全文
  console.log('[semantic] fallback to FTS5...');
  if (fs.existsSync(FTS_SCRIPT)) {
    try {
      execSync(`node ${FTS_SCRIPT} "${query}" --limit ${topK}`, {stdio:'inherit'});
      return;
    } catch (e) {
      console.log(`[semantic] FTS5 failed: ${e.message}`);
    }
  }

  // 3. Fallback 2: 关键词搜索
  console.log('[semantic] fallback to keyword...');
  try {
    execSync(`node ${KEYWORD_SCRIPT} "${query}" --limit ${topK}`, {stdio:'inherit'});
  } catch (e) {
    console.log(`[semantic] keyword failed: ${e.message}`);
    console.log('[semantic] all fallbacks exhausted');
  }
}

const query = process.argv[2];
const topK = parseInt(process.argv[3]) || 10;
if (!query) { console.log('Usage: node memory-semantic-fallback.js <query> [topK]'); process.exit(1); }
semanticSearch(query, topK);
