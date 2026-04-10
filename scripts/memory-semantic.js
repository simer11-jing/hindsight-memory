#!/usr/bin/env node

/**
 * 语义搜索 - 支持本地 + 云端(自定义API)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { SemanticSearch, HybridSearch } = require('../lib/retrieval/semantic-search');
const { MemoryEntry, LAYERS } = require('../lib/memory-entry');

let ConfigManager;
try {
  const config = require('../lib/config');
  ConfigManager = config.ConfigManager;
} catch (e) {
  ConfigManager = null;
}

const MEMORY_FILE = path.join(os.homedir(), '.openclaw/agents/main/MEMORY.md');
const INDEX_FILE = path.join(os.homedir(), '.openclaw/agents/main/.memory-index.json');

async function loadMemories() {
  const entries = [];
  if (!fs.existsSync(MEMORY_FILE)) return entries;
  
  const content = fs.readFileSync(MEMORY_FILE, 'utf-8');
  const layerKeys = Object.keys(LAYERS);
  let currentLayer = null;
  let currentContent = [];
  
  for (const line of content.split('\n')) {
    for (const layer of layerKeys) {
      if (line.includes(LAYERS[layer].name) || line.match(new RegExp(`##\\s+${LAYERS[layer].emoji}`))) {
        if (currentLayer && currentContent.length > 0) {
          entries.push(MemoryEntry.create(currentContent.join('\n').trim(), currentLayer, { source: 'MEMORY.md' }));
        }
        currentLayer = layer;
        currentContent = [];
        break;
      }
    }
    if (currentLayer && line.trim() && !line.startsWith('#')) currentContent.push(line);
  }
  if (currentLayer && currentContent.length > 0) {
    entries.push(MemoryEntry.create(currentContent.join('\n').trim(), currentLayer, { source: 'MEMORY.md' }));
  }
  return entries;
}

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')); } catch { return null; }
}

function saveIndex(entries) {
  const index = entries.map(e => ({ id: e.id, layer: e.layer, content: e.content.substring(0, 200), embedding: e.embedding }));
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log('✅ 索引已保存');
}

async function main() {
  const args = process.argv.slice(2);
  
  // 配置命令
  if (args[0] === '配置' || args[0] === 'config') {
    if (!ConfigManager) { console.log('❌ 配置模块不可用'); process.exit(1); }
    const config = new ConfigManager();
    const sub = args[1];
    
    if (!sub || sub === 'show') {
      config.showConfig();
    } else if (sub === 'models') {
      config.listModels();
    } else if (sub === 'enable-local') {
      config.enableVector({ type: 'local', model: args[2] || 'Xenova/all-MiniLM-L6-v2' });
    } else if (sub === 'enable-cloud') {
      const apiKey = process.env.OPENAI_API_KEY || args[2] || '';
      const baseURL = args[3] || '';
      const model = args[4] || 'text-embedding-3-small';
      config.enableVector({ type: 'cloud', apiKey, baseURL, cloudModel: model });
    } else if (sub === 'disable') {
      config.disableVector();
    } else if (sub === 'set-url' && args[2]) {
      config.setCloudConfig(null, args[2]);
    } else if (sub === 'set-key' && args[2]) {
      config.setCloudConfig(args[2]);
    }
    process.exit(0);
  }
  
  // 状态
  if (!args.length) {
    if (ConfigManager) {
      new ConfigManager().showConfig();
    } else {
      console.log('用法: node memory-semantic.js [索引|"查询"|配置]');
    }
    process.exit(0);
  }
  
  const cmd = args[0];
  
  // 索引
  if (cmd === '索引' || cmd === 'index') {
    console.log('⏳ 加载记忆...');
    const entries = await loadMemories();
    console.log(`📝 共 ${entries.length} 条记忆`);
    
    const semantic = new SemanticSearch();
    await semantic.init();
    await semantic.indexEntries(entries);
    saveIndex(entries);
    process.exit(0);
  }
  
  // 搜索
  const query = cmd;
  let options = { limit: 10, layer: 'all', threshold: 0.7 };
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--layer' && args[i + 1]) options.layer = args[++i];
    if (args[i] === '--limit' && args[i + 1]) options.limit = parseInt(args[++i]);
    if (args[i] === '--threshold' && args[i + 1]) options.threshold = parseFloat(args[++i]);
  }
  
  console.log(`🔍 搜索: "${query}"`);
  
  const entries = await loadMemories();
  const index = loadIndex();
  
  if (index) {
    console.log('📂 使用已有索引...');
    for (const idx of index) {
      const entry = entries.find(e => e.id === idx.id);
      if (entry && idx.embedding) entry.embedding = idx.embedding;
    }
  }
  
  const semantic = new SemanticSearch();
  const results = await semantic.search(entries, query, options);
  
  if (!results.length) {
    console.log('❌ 未找到结果，请先建立索引: node memory-semantic.js 索引');
    process.exit(0);
  }
  
  console.log(`\n═══ 搜索结果 (${results.length} 条) ===`);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const emoji = LAYERS[r.entry.layer]?.emoji || '📄';
    console.log(`${i + 1}. [${emoji}] ${r.score.toFixed(3)} - ${r.entry.content.substring(0, 60)}...`);
  }
}

main().catch(e => { console.error('❌ 错误:', e.message); process.exit(1); });