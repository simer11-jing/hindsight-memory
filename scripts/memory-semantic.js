#!/usr/bin/env node

/**
 * 语义搜索命令行工具
 * 使用方法:
 *   node memory-semantic.js "查询内容"
 *   node memory-semantic.js "查询内容" --layer mentalModels
 *   node memory-semantic.js "索引"  // 建立索引
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { SemanticSearch, HybridSearch } = require('../lib/retrieval/semantic-search');
const { MemoryEntry, LAYERS } = require('../lib/memory-entry');

const MEMORY_DIR = path.join(os.homedir(), '.openclaw/agents/main');
const MEMORY_FILE = path.join(MEMORY_DIR, 'MEMORY.md');
const INDEX_FILE = path.join(MEMORY_DIR, '.memory-index.json');

/**
 * 加载记忆
 */
async function loadMemories() {
  const entries = [];
  
  // 读取主文件
  if (fs.existsSync(MEMORY_FILE)) {
    const content = fs.readFileSync(MEMORY_FILE, 'utf-8');
    
    // 简单解析
    const layers = Object.keys(LAYERS);
    let currentLayer = null;
    let currentContent = [];
    
    for (const line of content.split('\n')) {
      // 检测层级
      for (const layer of layers) {
        if (line.includes(LAYERS[layer].name) || line.match(new RegExp(`##\\s+${LAYERS[layer].emoji}`))) {
          // 保存之前的
          if (currentLayer && currentContent.length > 0) {
            entries.push(MemoryEntry.create(
              currentContent.join('\n').trim(),
              currentLayer,
              { source: 'MEMORY.md' }
            ));
          }
          currentLayer = layer;
          currentContent = [];
          break;
        }
      }
      
      if (currentLayer && line.trim() && !line.startsWith('#')) {
        currentContent.push(line);
      }
    }
    
    // 最后一个
    if (currentLayer && currentContent.length > 0) {
      entries.push(MemoryEntry.create(
        currentContent.join('\n').trim(),
        currentLayer,
        { source: 'MEMORY.md' }
      ));
    }
  }
  
  return entries;
}

/**
 * 加载索引
 */
function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    try {
      const data = fs.readFileSync(INDEX_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * 保存索引
 */
function saveIndex(entries) {
  const index = entries.map(e => ({
    id: e.id,
    layer: e.layer,
    content: e.content.substring(0, 200), // 只存摘要
    embedding: e.embedding
  }));
  
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log('✅ 索引已保存');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════╗
║   语义搜索工具 v2.0                     ║
╚════════════════════════════════════════╝

使用方法:
  node memory-semantic.js "查询内容" [选项]
  node memory-semantic.js 索引
  node memory-semantic.js 状态

选项:
  --layer <层>     搜索指定层
  --limit <数量>   返回结果数量
  --threshold <值> 相似度阈值 (0-1)

示例:
  node memory-semantic.js "用户偏好什么"
  node memory-semantic.js "配置" --layer worldFacts
  node memory-semantic.js 索引
`);
    process.exit(0);
  }
  
  const command = args[0];
  
  // 索引命令
  if (command === '索引' || command === 'index') {
    console.log('⏳ 加载记忆...');
    const entries = await loadMemories();
    console.log(`📝 共 ${entries.length} 条记忆`);
    
    const semantic = new SemanticSearch();
    await semantic.init();
    
    console.log('⏳ 生成向量索引...');
    await semantic.indexEntries(entries);
    
    saveIndex(entries);
    console.log('✅ 索引建立完成');
    process.exit(0);
  }
  
  // 状态命令
  if (command === '状态' || command === 'status') {
    const index = loadIndex();
    if (index) {
      console.log(`📊 索引状态:`);
      console.log(`   记忆条目: ${index.length}`);
      const hasVectors = index.filter(e => e.embedding).length;
      console.log(`   向量索引: ${hasVectors}/${index.length}`);
    } else {
      console.log('❌ 未建立索引，请先运行: node memory-semantic.js 索引');
    }
    process.exit(0);
  }
  
  // 搜索命令
  const query = command;
  let options = {
    limit: 10,
    layer: 'all',
    threshold: 0.5
  };
  
  // 解析选项
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--layer' && args[i + 1]) {
      options.layer = args[++i];
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i]);
    } else if (arg === '--threshold' && args[i + 1]) {
      options.threshold = parseFloat(args[++i]);
    }
  }
  
  console.log(`🔍 语义搜索: "${query}"`);
  console.log(`   层: ${options.layer}, 限制: ${options.limit}`);
  
  // 加载记忆
  const entries = await loadMemories();
  
  // 检查是否有索引
  const index = loadIndex();
  if (index) {
    console.log('📂 使用已有索引...');
    // 合并索引中的向量
    for (const idx of index) {
      const entry = entries.find(e => e.id === idx.id);
      if (entry && idx.embedding) {
        entry.embedding = idx.embedding;
      }
    }
  }
  
  const semantic = new SemanticSearch();
  
  try {
    const results = await semantic.search(entries, query, options);
    
    if (results.length === 0) {
      console.log('❌ 未找到相似结果');
      console.log('💡 提示: 请先运行 "node memory-semantic.js 索引" 建立向量索引');
      process.exit(0);
    }
    
    console.log(`
╔════════════════════════════════════════╗
║   搜索结果 (${results.length} 条)               ║
╚════════════════════════════════════════╝
`);
    
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const layerEmoji = LAYERS[r.entry.layer]?.emoji || '📄';
      const content = r.entry.content.substring(0, 100);
      
      console.log(`${i + 1}. [${layerEmoji}] ${r.score.toFixed(3)} - ${content}...`);
    }
    
  } catch (error) {
    console.error('❌ 搜索失败:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);