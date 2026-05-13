#!/usr/bin/env node
/**
 * Memory Query Router
 * 检索优先级：KG-Lite -> FTS5 -> Semantic Fallback -> Keyword
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MEMORY_BASE || path.resolve(__dirname, '..');
const MEMORY = path.join(BASE, 'MEMORY.md');

function kgSearch(query) {
  if (!fs.existsSync(MEMORY)) return false;
  const txt = fs.readFileSync(MEMORY, 'utf-8');
  const lines = txt.split('\n').filter(l => l.includes('->'));
  const hits = lines.filter(l => l.toLowerCase().includes(query.toLowerCase()));
  if (hits.length) {
    console.log('[router] KG-Lite hits:');
    hits.slice(0,10).forEach(h => console.log(h));
    return true;
  }
  return false;
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

const query = process.argv[2];
const topK = parseInt(process.argv[3]) || 10;
if (!query) {
  console.log('Usage: node memory-query-router.js <query> [topK]');
  process.exit(1);
}

if (kgSearch(query)) process.exit(0);

console.log('[router] no KG hit, trying FTS5...');
try {
  run(`node ${path.join(BASE, 'scripts', 'fts-search.js')} "${query}" ${topK}`);
  process.exit(0);
} catch {}

console.log('[router] FTS5 unavailable, trying semantic fallback...');
try {
  run(`node ${path.join(BASE, 'scripts', 'memory-semantic-fallback.js')} "${query}" ${topK}`);
  process.exit(0);
} catch {}

console.log('[router] semantic fallback unavailable, trying keyword...');
run(`node ${path.join(BASE, 'scripts', 'memory-tempr.js')} "${query}"`);
