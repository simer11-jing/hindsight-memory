#!/usr/bin/env node

/**
 * 语义搜索命令行工具 - 支持配置
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

const MEMORY_DIR = path.join(os.homedir(), '.openclaw/agents/main');
const MEMORY_FILE = path.join(MEMORY_DIR, 'MEMORY.md');
const INDEX_FILE = path.join(MEMORY_DIR, '.memory-index.json');

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
  
  if (args.length === 0) {
    if (ConfigManager) {
      const config = new ConfigManager();
      console.log(`
╔════════════════════════════════════════╗
║   语义搜索工具 v2.0                     ║
╚════════════════════════════════════════╝

状态: ${config.get('vector.enabled') ? '✅ 已启用' : '❌ 已禁用'}
模型: ${config.get('vector.model')}
维度: ${config.get('vector.dimensions')}
设备: ${config.get('vector.device')}

使用:
  node memory-semantic.js 索引    # 建立索引
  node memory-semantic.js "查询"  # 语义搜索
  node memory-semantic.js 配置    # 配置管理
`);
    } else {
      console.log('用法: node memory-semantic.js [索引|"查询"]');
    }
    process.exit(0);
  }
  
  const cmd = args[0];
  
  if (cmd === '配置' || cmd === 'config') {
    if (!ConfigManager) {
      console.log('❌ 配置模块不可用');
      process.exit(1);
    }
    const config = new ConfigManager();
    const subCmd = args[1];
    
    if (!subCmd || subCmd === 'show') {
      console.log(`\n📊 当前配置:
   向量搜索: ${config.get('vector.enabled') ? '✅ 启用' : '❌ 禁用'}
   模型: ${config.get('vector.model')}
   维度: ${config.get('vector.dimensions')}
   设备: ${config.get('vector.device')}
   阈值: ${config.get('vector.threshold')}\n`);
    } else if (subCmd === 'models') {
      config.listModels();
    } else if (subCmd === 'enable') {
      const opts = {};
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--model' && args[i+1]) opts.model = args[++i];
        if (args[i] === '--device' && args[i+1]) opts.device = args[++i];
      }
      config.enableVector(opts);
    } else if (subCmd === 'disable') {
      config.disableVector();
    } else if (subCmd === 'set-model' && args[2]) {
      config.setModel(args[2]);
    }
    process.exit(0);
  }
  
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
  
  const query = cmd;
  let options = { limit: 10, layer: 'all', threshold: 0.7 };
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--layer' && args[i + 1]) options.layer = args[++i];
    if (arg === '--limit' && args[i + 1]) options.limit = parseInt(args[++i]);
    if (arg === '--threshold' && args[i + 1]) options.threshold = parseFloat(args[++i]);
  }
  
  console.log(`🔍 语义搜索: "${query}"`);
  
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
  
  if (results.length === 0) {
    console.log('❌ 未找到相似结果');
    console.log('💡 请先运行: node memory-semantic.js 索引');
    process.exit(0);
  }
  
  console.log(`\n╔═════════════════════════════════╗`);
  console.log(`║   搜索结果 (${results.length} 条)            ║`);
  console.log(`╚═════════════════════════════════╝`);
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const emoji = LAYERS[r.entry.layer]?.emoji || '📄';
    const content = r.entry.content.substring(0, 80);
    console.log(`${i + 1}. [${emoji}] ${r.score.toFixed(3)} - ${content}...`);
  }
}

main().catch(e => { console.error('❌ 错误:', e.message); process.exit(1); });