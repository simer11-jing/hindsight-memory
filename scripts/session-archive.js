#!/usr/bin/env node
/**
 * Session Archive - 将已完成任务归档为长程记忆
 * 
 * 功能：
 * - 从 sessions/ 目录读取已完成会话
 * - 提取关键信息并生成归档记录
 * - 写入 memory/archive/ 目录
 * - 用于长程召回
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = '/home/jinghao/.openclaw/agents/main';
const SESSIONS_DIR = path.join(BASE_DIR, 'sessions');
const ARCHIVE_DIR = path.join(BASE_DIR, 'memory', 'archive');
const MANIFEST_FILE = path.join(ARCHIVE_DIR, 'manifest.json');

/**
 * 读取 session 文件
 */
function readSession(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const messages = lines.map(l => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    return messages;
  } catch (err) {
    return [];
  }
}

/**
 * 提取会话关键信息
 */
function extractSessionInfo(messages) {
  if (messages.length === 0) return null;
  
  const first = messages[0];
  const last = messages[messages.length - 1];
  
  // 获取会话时间
  const startTime = first.ts || first.timestamp || new Date().toISOString();
  const endTime = last.ts || last.timestamp || new Date().toISOString();
  
  // 提取第一条用户消息
  const firstUserMsg = messages.find(m => m.role === 'user' || m.type === 'user');
  const userPrompt = firstUserMsg?.content || firstUserMsg?.text || '';
  
  // 提取最后一条助手回复
  const lastAssistantMsg = messages.find(m => m.role === 'assistant' || m.type === 'assistant');
  const assistantResponse = lastAssistantMsg?.content || lastAssistantMsg?.text || '';
  
  // 提取工具调用
  const tools = messages.filter(m => m.type === 'tool' || m.tool);
  
  // 提取会话标签
  const tags = [];
  if (userPrompt.includes('项目分析') || userPrompt.includes('指标')) tags.push('项目分析');
  if (userPrompt.includes('代码') || userPrompt.includes('编程')) tags.push('代码');
  if (userPrompt.includes('记忆') || userPrompt.includes('MEMORY')) tags.push('记忆');
  if (userPrompt.includes('配置') || userPrompt.includes('config')) tags.push('配置');
  
  return {
    startTime,
    endTime,
    userPrompt: userPrompt.substring(0, 200),
    assistantSummary: assistantResponse.substring(0, 300),
    toolCount: tools.length,
    messageCount: messages.length,
    tags
  };
}

/**
 * 生成归档记录
 */
function generateArchiveEntry(sessionId, info) {
  const now = new Date().toISOString();
  
  return `# Session Archive

> 归档时间: ${now}
> Session ID: ${sessionId}

## 任务概要
${info.userPrompt}

## 执行结果
${info.assistantSummary}

## 统计
- 消息数: ${info.messageCount}
- 工具调用: ${info.toolCount}
- 开始时间: ${info.startTime}
- 结束时间: ${info.endTime}

## 标签
${info.tags.map(t => `- ${t}`).join('\n') || '<!-- 无特定标签 -->'}

## 教训/结论
<!-- 从执行过程中提取的关键教训 -->

---
_由 Session Archive 自动生成_
`;
}

/**
 * 更新清单
 */
function updateManifest(entries) {
  const manifest = {
    lastUpdated: new Date().toISOString(),
    totalArchives: entries.length,
    entries: entries.slice(0, 100) // 只保留最近 100 条摘要
  };
  
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

/**
 * 搜索归档
 */
function searchArchive(keywords) {
  if (!fs.existsSync(ARCHIVE_DIR)) return [];
  
  const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.md'));
  const results = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf-8');
    for (const kw of keywords) {
      if (content.toLowerCase().includes(kw.toLowerCase())) {
        results.push({
          name: file.replace('.md', ''),
          path: path.join(ARCHIVE_DIR, file),
          match: kw
        });
        break;
      }
    }
  }
  
  return results;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Session Archive - 将已完成任务归档为长程记忆

用法:
  node session-archive.js [选项]

选项:
  --help, -h      显示帮助
  --list           列出所有归档
  --search <词>    搜索归档
  --archive <id>   归档指定会话
  --recent <n>     归档最近 N 个会话（默认 5）
    `);
    process.exit(0);
  }
  
  if (args.includes('--list')) {
    if (!fs.existsSync(ARCHIVE_DIR)) {
      console.log('No archives found.');
      return;
    }
    const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.md'));
    console.log(`Found ${files.length} archives:\n`);
    files.slice(-10).reverse().forEach(f => console.log(`  - ${f.replace('.md', '')}`));
    return;
  }
  
  if (args.includes('--search')) {
    const idx = args.indexOf('--search');
    const keyword = args[idx + 1];
    if (!keyword) {
      console.error('Please provide a keyword to search');
      return;
    }
    const results = searchArchive([keyword]);
    if (results.length === 0) {
      console.log(`No archives found matching "${keyword}"`);
    } else {
      console.log(`Found ${results.length} matching archives:\n`);
      results.forEach(r => console.log(`  - ${r.name} (matched: ${r.match})`));
    }
    return;
  }
  
  // 确定要归档的会话数
  let count = 5;
  if (args.includes('--recent')) {
    const idx = args.indexOf('--recent');
    count = parseInt(args[idx + 1]) || 5;
  }
  
  // 获取最近会话
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.error('Sessions directory not found:', SESSIONS_DIR);
    process.exit(1);
  }
  
  const sessionFiles = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
      name: f,
      path: path.join(SESSIONS_DIR, f),
      mtime: fs.statSync(path.join(SESSIONS_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, count);
  
  console.log(`Found ${sessionFiles.length} recent sessions to archive\n`);
  
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  
  const entries = [];
  
  for (const session of sessionFiles) {
    const sessionId = session.name.replace('.jsonl', '');
    const messages = readSession(session.path);
    const info = extractSessionInfo(messages);
    
    if (!info) {
      console.log(`Skipping empty session: ${sessionId}`);
      continue;
    }
    
    const archiveContent = generateArchiveEntry(sessionId, info);
    const archivePath = path.join(ARCHIVE_DIR, `${sessionId}.md`);
    
    fs.writeFileSync(archivePath, archiveContent);
    
    entries.push({
      sessionId,
      path: archivePath,
      tags: info.tags,
      time: info.startTime
    });
    
    console.log(`Archived: ${sessionId}`);
    console.log(`  Prompt: ${info.userPrompt.substring(0, 60)}...`);
    console.log(`  Tags: ${info.tags.join(', ') || 'none'}`);
    console.log('');
  }
  
  updateManifest(entries);
  console.log(`\nTotal archives: ${entries.length}`);
}

main().catch(console.error);
