#!/usr/bin/env node

/**
 * 自动标签脚本
 * 为记忆内容自动添加标签，分类整理，快速筛选
 * 
 * 使用方法: 
 *   node memory-auto-tag.js [文件路径]
 *   node memory-auto-tag.js --list
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_FILE = path.join(os.homedir(), '.openclaw/agents/main/MEMORY.md');
const TAGS_FILE = path.join(os.homedir(), '.openclaw/agents/main/memory/tags.json');

// 预定义标签规则
const TAG_RULES = {
  // 技术相关
  '🔧 技术': /(代码|编程|开发|API|接口|服务|配置|部署|版本)/i,
  '💻 系统': /(Linux|Windows|Mac|Ubuntu|CentOS|服务器|主机)/i,
  '🤖 AI': /(AI|智能体|Agent|OpenClaw|Claude|GPT|模型)/i,
  
  // 项目相关
  '📁 项目': /(项目|功能|模块|组件|仓库|GitHub)/i,
  '🛠️ 工具': /(工具|命令|VS Code|terminal|shell)/i,
  
  // 用户相关
  '👤 用户': /(用户|客户|个人|偏好|习惯)/i,
  '📞 联系': /(邮箱|电话|微信|QQ|地址)/i,
  
  // 状态相关
  '✅ 完成': /(完成|已修复|已解决|✅)/i,
  '🔄 进行中': /(进行中|处理中|待处理|⏳)/i,
  '⚠️ 问题': /(问题|错误|bug|失败|❌)/i,
  
  // 时间相关
  '📅 日期': /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}/,
  '⏰ 时间': /\d{1,2}时|上午|下午|晚上|今天|明天|昨天/
};

/**
 * 自动检测内容中的标签
 */
function detectTags(content) {
  const tags = new Set();
  
  for (const [tag, regex] of Object.entries(TAG_RULES)) {
    if (regex.test(content)) {
      tags.add(tag);
    }
  }
  
  return Array.from(tags);
}

/**
 * 为每行内容添加标签
 */
function tagContent(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const tagged = [];
  
  for (const line of lines) {
    if (line.trim().startsWith('#') || line.trim().startsWith('##')) {
      // 标题行，检测整段标签
      tagged.push({ line, tags: [] });
    } else if (line.trim()) {
      const tags = detectTags(line);
      if (tags.length > 0) {
        tagged.push({ line, tags });
      } else {
        tagged.push({ line, tags: [] });
      }
    }
  }
  
  return tagged;
}

/**
 * 生成标签统计
 */
function generateStats(tagged) {
  const stats = {};
  
  for (const item of tagged) {
    for (const tag of item.tags) {
      stats[tag] = (stats[tag] || 0) + 1;
    }
  }
  
  return stats;
}

/**
 * 保存标签索引
 */
function saveIndex(filePath, tagged) {
  // 确保目录存在
  const dir = path.dirname(TAGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const stats = generateStats(tagged);
  
  const index = {
    source: filePath,
    generated: new Date().toISOString(),
    total: tagged.length,
    tagged: tagged.filter(t => t.tags.length > 0).length,
    stats,
    entries: tagged
  };
  
  fs.writeFileSync(TAGS_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`✅ 标签索引已保存到: ${TAGS_FILE}`);
  
  return index;
}

/**
 * 列出所有标签
 */
function listTags() {
  if (!fs.existsSync(TAGS_FILE)) {
    console.log('❌ 尚未生成标签索引，请先运行: node memory-auto-tag.js');
    return;
  }
  
  const index = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'));
  
  console.log(`
╔════════════════════════════════════════╗
║   MEMORY 标签统计                       ║
╚════════════════════════════════════════╝

📊 总条目: ${index.total}
🏷️  已标记: ${index.tagged}
📅 生成时间: ${index.generated}

🏷️ 标签统计:
`);
  
  const sortedStats = Object.entries(index.stats)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [tag, count] of sortedStats) {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${tag.padEnd(15)} ${count.toString().padStart(3)} ${bar}`);
  }
  
  console.log('');
}

/**
 * 搜索特定标签
 */
function searchByTag(tag) {
  if (!fs.existsSync(TAGS_FILE)) {
    console.log('❌ 尚未生成标签索引');
    return;
  }
  
  const index = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'));
  
  console.log(`\n🏷️ 搜索标签: ${tag}\n`);
  console.log('─'.repeat(50));
  
  let count = 0;
  for (const entry of index.entries) {
    if (entry.tags.includes(tag)) {
      count++;
      console.log(`  ${entry.line}`);
    }
  }
  
  console.log('─'.repeat(50));
  console.log(`共 ${count} 条匹配\n`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════╗
║   MEMORY 自动标签工具 v1.0             ║
╚════════════════════════════════════════╝

使用方法:
  node memory-auto-tag.js [文件路径]     分析并标记内容
  node memory-auto-tag.js --list         列出所有标签
  node memory-auto-tag.js --search <tag> 搜索特定标签
  node memory-auto-tag.js --help         显示帮助

示例:
  node memory-auto-tag.js
  node memory-auto-tag.js ./MEMORY.md
  node memory-auto-tag.js --list
  node memory-auto-tag.js --search "🔧 技术"
`);
    process.exit(0);
  }
  
  // 处理选项
  if (args[0] === '--list') {
    listTags();
    return;
  }
  
  if (args[0] === '--search') {
    const tag = args[1];
    if (!tag) {
      console.log('❌ 请指定要搜索的标签');
      process.exit(1);
    }
    searchByTag(tag);
    return;
  }
  
  if (args[0] === '--help') {
    main();
    return;
  }
  
  // 默认：执行标记
  const filePath = path.isAbsolute(args[0]) ? args[0] : path.join(process.cwd(), args[0]);
  const useDefault = !args[0] || !fs.existsSync(filePath);
  
  if (useDefault) {
    console.log(`📁 使用默认文件: ${DEFAULT_FILE}\n`);
  }
  
  const targetFile = useDefault ? DEFAULT_FILE : filePath;
  
  console.log(`🔍 正在分析: ${targetFile}\n`);
  
  const tagged = tagContent(targetFile);
  
  if (tagged) {
    const index = saveIndex(targetFile, tagged);
    
    console.log('\n📊 标签统计:\n');
    const sortedStats = Object.entries(index.stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [tag, count] of sortedStats) {
      console.log(`  ${tag}: ${count}`);
    }
    
    console.log('');
  }
}

main();