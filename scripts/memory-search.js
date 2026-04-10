#!/usr/bin/env node

/**
 * 跨文件检索脚本
 * 支持搜索多个 memory/*.md 文件，关键词高亮，结果排序
 * 
 * 使用方法: 
 *   node memory-search.js "关键词"
 *   node memory-search.js "关键词" --dir /path/to/memory
 *   node memory-search.js "关键词" --json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_DIR = path.join(os.homedir(), '.openclaw/agents/main/memory');

/**
 * 高亮关键词
 */
function highlight(text, keyword) {
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '[$1]');
}

/**
 * 搜索文件
 */
function searchFile(filePath, keyword, options = {}) {
  const { caseSensitive = false, wholeWord = false } = options;
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results = [];
  
  // 构建正则
  let pattern = keyword;
  if (wholeWord) {
    pattern = `\\b${keyword}\\b`;
  }
  const regex = new RegExp(pattern, caseSensitive ? '' : 'i');
  
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      results.push({
        line: i + 1,
        content: lines[i].trim(),
        highlight: highlight(lines[i], keyword)
      });
    }
  }
  
  return {
    file: filePath,
    matches: results.length,
    results
  };
}

/**
 * 搜索目录
 */
function searchDirectory(dirPath, keyword, options = {}) {
  const { recursive = false, extensions = ['.md'] } = options;
  
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ 目录不存在: ${dirPath}`);
    return [];
  }
  
  const results = [];
  
  function scan(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && recursive) {
        scan(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (extensions.includes(ext)) {
          const result = searchFile(fullPath, keyword, options);
          if (result && result.matches > 0) {
            results.push(result);
          }
        }
      }
    }
  }
  
  scan(dirPath);
  
  // 按匹配数排序
  results.sort((a, b) => b.matches - a.matches);
  
  return results;
}

/**
 * 格式化输出
 */
function formatResults(results, options = {}) {
  const { color = true, json = false, showLine = true } = options;
  
  if (json) {
    return JSON.stringify(results, null, 2);
  }
  
  let output = '';
  
  for (const result of results) {
    const fileName = path.basename(result.file);
    output += `\n📄 ${fileName} (${result.matches} 个匹配)\n`;
    output += '─'.repeat(50) + '\n';
    
    for (const match of result.results) {
      if (showLine) {
        output += `  ${match.line.toString().padStart(3)}: ${match.highlight}\n`;
      } else {
        output += `  • ${match.highlight}\n`;
      }
    }
  }
  
  return output;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════╗
║   MEMORY 跨文件检索工具 v1.0           ║
╚════════════════════════════════════════╝

使用方法:
  node memory-search.js "关键词" [选项]

选项:
  --dir <path>      搜索目录 (默认: ~/.openclaw/agents/main/memory)
  --recursive       递归搜索子目录
  --case-sensitive  区分大小写
  --whole-word      全词匹配
  --json            JSON 格式输出
  --no-line         不显示行号

示例:
  node memory-search.js "配置"
  node memory-search.js "2026" --dir /path/to/memory
  node memory-search.js "密码" --json
`);
    process.exit(0);
  }
  
  // 解析参数
  let keyword = args[0];
  let dirPath = DEFAULT_DIR;
  let options = {
    color: true,
    json: false,
    showLine: true,
    recursive: false,
    caseSensitive: false,
    wholeWord: false
  };
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dir':
        dirPath = args[++i];
        break;
      case '--recursive':
        options.recursive = true;
        break;
      case '--case-sensitive':
        options.caseSensitive = true;
        break;
      case '--whole-word':
        options.wholeWord = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--no-line':
        options.showLine = false;
        break;
    }
  }
  
  console.log(`
╔════════════════════════════════════════╗
║   MEMORY 跨文件检索工具 v1.0           ║
╚════════════════════════════════════════╝

🔍 关键词: "${keyword}"
📁 搜索目录: ${dirPath}
🔄 递归搜索: ${options.recursive ? '是' : '否'}
`);
  
  const results = searchDirectory(dirPath, keyword, options);
  
  if (results.length === 0) {
    console.log('\n❌ 未找到匹配结果\n');
    process.exit(0);
  }
  
  const totalMatches = results.reduce((sum, r) => sum + r.matches, 0);
  console.log(`\n✅ 找到 ${results.length} 个文件，共 ${totalMatches} 个匹配\n`);
  
  console.log(formatResults(results, options));
}

main();