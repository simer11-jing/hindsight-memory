#!/usr/bin/env node

/**
 * TEMPR 检索脚本
 * Temporal + Entity + Keyword + Psychological + Relational Memory Retrieval
 * 
 * 使用方法: 
 *   node memory-tempr.sh "查询内容"
 *   node memory-tempr.sh "查询内容" --layer mental
 *   node memory-tempr.sh "查询内容" --json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MEMORY_DIR = path.join(os.homedir(), '.openclaw/agents/main');
const MEMORY_FILE = path.join(MEMORY_DIR, 'MEMORY.md');
const DAILY_DIR = path.join(MEMORY_DIR, 'memory');

// 四层定义
const LAYERS = {
  mental: { title: 'Mental Models', emoji: '🧠', pattern: /^## 🧠/m },
  observations: { title: 'Observations', emoji: '👁️', pattern: /^## 👁️/m },
  worldFacts: { title: 'World Facts', emoji: '🌍', pattern: /^## 🌍/m },
  experiences: { title: 'Experiences', emoji: '🎭', pattern: /^## 🎭/m }
};

/**
 * 提取指定层的内容
 */
function extractLayer(content, layerName) {
  const layers = Object.keys(LAYERS);
  const layerIndex = layers.indexOf(layerName);
  
  if (layerIndex === -1) return '';
  
  const startPattern = LAYERS[layerName].pattern;
  const startMatch = content.match(startPattern);
  
  if (!startMatch) return '';
  
  const startPos = startMatch.index;
  
  // 找下一层或文件结束
  let endPos = content.length;
  for (let i = layerIndex + 1; i < layers.length; i++) {
    const nextMatch = content.match(LAYERS[layers[i]].pattern);
    if (nextMatch && nextMatch.index > startPos) {
      endPos = nextMatch.index;
      break;
    }
  }
  
  return content.slice(startPos, endPos).trim();
}

/**
 * 关键词搜索
 */
function keywordSearch(content, keyword, options = {}) {
  const { caseSensitive = false, wholeWord = false } = options;
  
  let pattern = keyword;
  if (wholeWord) {
    pattern = `\\b${keyword}\\b`;
  }
  
  const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  const lines = content.split('\n');
  const results = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      results.push({
        line: i + 1,
        content: lines[i].trim(),
        layer: detectLayer(lines, i)
      });
    }
  }
  
  return results;
}

/**
 * 检测当前行属于哪一层
 */
function detectLayer(lines, currentIndex) {
  let currentLayer = null;
  
  for (let i = currentIndex; i >= 0; i--) {
    const line = lines[i];
    for (const [name, def] of Object.entries(LAYERS)) {
      if (line.match(def.pattern)) {
        currentLayer = name;
        break;
      }
    }
    if (currentLayer) break;
  }
  
  return currentLayer;
}

/**
 * 时间范围搜索
 */
function temporalSearch(content, timeRange = 'all') {
  const datePattern = /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}/g;
  const lines = content.split('\n');
  const results = [];
  const now = new Date();
  
  for (let i = 0; i < lines.length; i++) {
    const dates = lines[i].match(datePattern);
    if (dates) {
      // 简单过滤：近期（30天内）
      let include = false;
      if (timeRange === 'all') {
        include = true;
      } else if (timeRange === 'recent') {
        include = true; // 显示所有带日期的
      }
      
      if (include) {
        results.push({
          line: i + 1,
          content: lines[i].trim(),
          dates: dates,
          layer: detectLayer(lines, i)
        });
      }
    }
  }
  
  return results;
}

/**
 * 实体关联搜索
 */
function entitySearch(content, entity) {
  const lines = content.split('\n');
  const results = [];
  
  // 常见实体模式
  const entityPatterns = [
    new RegExp(entity, 'i'),
    new RegExp(`${entity}[s]?`, 'i'),  // 复数
    new RegExp(`${entity}[:：]`, 'i')  // 键值对
  ];
  
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of entityPatterns) {
      if (pattern.test(lines[i])) {
        results.push({
          line: i + 1,
          content: lines[i].trim(),
          layer: detectLayer(lines, i)
        });
        break;
      }
    }
  }
  
  return results;
}

/**
 * 语义搜索（调用 memory_recall）
 */
async function semanticSearch(query) {
  // 尝试调用 OpenClaw 的 memory_recall
  try {
    // 这个需要在 OpenClaw 环境中运行
    // 这里只是占位，实际会通过 Skill 调用
    return {
      tool: 'memory_recall',
      query: query,
      note: '需要通过 /remember 技能调用'
    };
  } catch (e) {
    return null;
  }
}

/**
 * 综合检索
 */
async function search(query, options = {}) {
  const { layer = 'all', json = false, temporal = false, entity = null } = options;
  
  let content = '';
  
  // 读取主记忆文件
  if (fs.existsSync(MEMORY_FILE)) {
    content = fs.readFileSync(MEMORY_FILE, 'utf-8');
  }
  
  // 读取每日记忆
  if (fs.existsSync(DAILY_DIR)) {
    const dailyFiles = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.md'));
    for (const file of dailyFiles.slice(-7)) { // 只读最近7天
      const dailyContent = fs.readFileSync(path.join(DAILY_DIR, file), 'utf-8');
      content += '\n\n' + dailyContent;
    }
  }
  
  if (!content) {
    return { error: 'No memory files found', query };
  }
  
  const results = {
    query,
    timestamp: new Date().toISOString(),
    keyword: [],
    temporal: [],
    entity: [],
    semantic: null
  };
  
  // 关键词搜索
  const targetContent = layer === 'all' ? content : extractLayer(content, layer);
  results.keyword = keywordSearch(targetContent, query);
  
  // 时间搜索
  if (temporal) {
    results.temporal = temporalSearch(targetContent);
  }
  
  // 实体搜索
  if (entity) {
    results.entity = entitySearch(targetContent, entity);
  }
  
  // 语义搜索（标记需要外部调用）
  results.semantic = await semanticSearch(query);
  
  return results;
}

/**
 * 格式化输出
 */
function formatResults(results, options = {}) {
  const { verbose = false, json = false } = options;
  
  if (json) {
    return JSON.stringify(results, null, 2);
  }
  
  let output = `
╔════════════════════════════════════════╗
║   TEMPR 记忆检索结果                   ║
╚════════════════════════════════════════╝

🔍 查询: "${results.query}"
⏰ 时间: ${results.timestamp}

`;

  // 关键词匹配
  if (results.keyword.length > 0) {
    output += `📝 关键词匹配 (${results.keyword.length} 条):\n`;
    output += '─'.repeat(40) + '\n';
    
    for (const match of results.keyword.slice(0, 10)) {
      const emoji = LAYERS[match.layer]?.emoji || '📄';
      output += `  ${emoji} ${match.content}\n`;
    }
    
    if (results.keyword.length > 10) {
      output += `  ... 还有 ${results.keyword.length - 10} 条\n`;
    }
    output += '\n';
  }
  
  // 时间匹配
  if (results.temporal && results.temporal.length > 0) {
    output += `📅 时间匹配 (${results.temporal.length} 条):\n`;
    output += '─'.repeat(40) + '\n';
    
    for (const match of results.temporal.slice(0, 5)) {
      output += `  ${match.content}\n`;
    }
    output += '\n';
  }
  
  // 实体匹配
  if (results.entity && results.entity.length > 0) {
    output += `🔗 实体匹配 (${results.entity.length} 条):\n`;
    output += '─'.repeat(40) + '\n';
    
    for (const match of results.entity.slice(0, 5)) {
      output += `  ${match.content}\n`;
    }
    output += '\n';
  }
  
  // 统计
  const total = results.keyword.length + 
    (results.temporal?.length || 0) + 
    (results.entity?.length || 0);
  
  output += `📊 总计: ${total} 条匹配\n`;
  
  if (results.semantic) {
    output += `\n💡 提示: 可使用 /remember 技能进行语义搜索\n`;
  }
  
  return output;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════╗
║   TEMPR 记忆检索工具 v1.0              ║
║   (Temporal + Entity + Keyword + ...)  ║
╚════════════════════════════════════════╝

使用方法:
  node memory-tempr.sh "关键词" [选项]
  node memory-tempr.sh "关键词" --layer mental
  node memory-tempr.sh "关键词" --json
  node memory-tempr.sh "关键词" --temporal

选项:
  --layer <层>      搜索指定层 (mental/observations/worldFacts/experiences/all)
  --temporal        启用时间范围搜索
  --entity <实体>   启用实体搜索
  --json            JSON 格式输出
  --verbose         详细输出

示例:
  node memory-tempr.sh "配置"
  node memory-tempr.sh "密码" --layer mental
  node memory-tempr.sh "2026" --temporal
  node memory-tempr.sh "用户" --entity "用户"
`);
    process.exit(0);
  }
  
  // 解析参数
  let query = '';
  let options = {
    layer: 'all',
    json: false,
    temporal: false,
    entity: null,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (!arg.startsWith('--')) {
      query = arg;
    } else {
      switch (arg) {
        case '--layer':
          options.layer = args[++i];
          break;
        case '--temporal':
          options.temporal = true;
          break;
        case '--entity':
          options.entity = args[++i];
          break;
        case '--json':
          options.json = true;
          break;
        case '--verbose':
          options.verbose = true;
          break;
      }
    }
  }
  
  if (!query) {
    console.error('❌ 请输入查询关键词');
    process.exit(1);
  }
  
  console.log(`🔍 正在搜索: "${query}"...`);
  
  const results = await search(query, options);
  
  if (results.error) {
    console.error('❌ 错误:', results.error);
    process.exit(1);
  }
  
  console.log(formatResults(results, options));
}

main().catch(console.error);