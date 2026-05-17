#!/usr/bin/env node
/**
 * SOP Generator - GenericAgent-inspired 自动生成可复用流程
 * 
 * 功能：
 * - 每次任务完成后，从执行过程自动生成 SOP
 * - 生成后可供后续类似任务直接调用
 * - 存储在 memory/skills/ 目录
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = '/home/jinghao/.openclaw/agents/main';
const SKILLS_DIR = path.join(BASE_DIR, 'memory', 'skills');
const STM_FILE = path.join(BASE_DIR, 'memory', 'stm-current.md');

/**
 * 从 STM 内容提取关键信息生成 SOP
 */
function extractFromStm(stmContent) {
  const lines = stmContent.split('\n').filter(l => l.trim());
  
  const decisions = [];
  const facts = [];
  const preferences = [];
  
  let currentSection = null;
  
  for (const line of lines) {
    if (line.includes('### 关键决策')) {
      currentSection = 'decisions';
    } else if (line.includes('### 用户偏好')) {
      currentSection = 'preferences';
    } else if (line.includes('### 待归档')) {
      currentSection = 'facts';
    } else if (line.startsWith('## ') || line.startsWith('# ')) {
      currentSection = null;
    } else if (line.startsWith('<!--') || line.startsWith('>')) {
      continue;
    } else if (currentSection === 'decisions' && line.trim()) {
      decisions.push(line.trim());
    } else if (currentSection === 'preferences' && line.trim()) {
      preferences.push(line.trim());
    } else if (currentSection === 'facts' && line.trim()) {
      facts.push(line.trim());
    }
  }
  
  return { decisions, preferences, facts };
}

/**
 * 生成 SOP 文档
 */
function generateSop(taskName, extracted) {
  const now = new Date().toISOString();
  const id = `sop-${Date.now()}`;
  
  return `# SOP: ${taskName}

> 自动生成自 GenericAgent 启发 - ${now}
> ID: ${id}

## 概述
${taskName}

## 触发条件
<!-- 描述何时应该使用此 SOP -->

## 执行步骤

${extracted.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

## 关键参数
${extracted.facts.length > 0 ? extracted.facts.map(f => `- ${f}`).join('\n') : '<!-- 无特定参数 -->'}

## 注意事项
${extracted.preferences.length > 0 ? extracted.preferences.map(p => `- ${p}`).join('\n') : '<!-- 无特定偏好 -->'}

## 使用示例
\`\`\`
<!-- 描述如何调用此 SOP -->
\`\`\`

---
_由 SOP Generator 自动生成_
`;
}

/**
 * 搜索相似 SOP
 */
function findSimilarSops(keywords) {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  
  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
  const results = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf-8');
    for (const kw of keywords) {
      if (content.toLowerCase().includes(kw.toLowerCase())) {
        results.push({
          name: file.replace('.md', ''),
          path: path.join(SKILLS_DIR, file),
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
SOP Generator - 自动生成可复用流程

用法:
  node generate-sop.js <任务名> [关键词...]

示例:
  node generate-sop.js "项目分析分析-英超" 项目分析 分析
  node generate-sop.js "代码审查" 代码 审查

选项:
  --help, -h     显示帮助
  --list         列出所有 SOP
  --search <词>   搜索相似 SOP
  --run <名称>    运行指定 SOP
    `);
    process.exit(0);
  }
  
  if (args.includes('--list')) {
    if (!fs.existsSync(SKILLS_DIR)) {
      console.log('No SOPs found.');
      return;
    }
    const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
    console.log(`Found ${files.length} SOPs:\n`);
    files.forEach(f => console.log(`  - ${f.replace('.md', '')}`));
    return;
  }
  
  if (args.includes('--search')) {
    const idx = args.indexOf('--search');
    const keyword = args[idx + 1];
    if (!keyword) {
      console.error('Please provide a keyword to search');
      return;
    }
    const results = findSimilarSops([keyword]);
    if (results.length === 0) {
      console.log(`No SOPs found matching "${keyword}"`);
    } else {
      console.log(`Found ${results.length} matching SOPs:\n`);
      results.forEach(r => console.log(`  - ${r.name} (matched: ${r.match})`));
    }
    return;
  }
  
  if (args.length < 1) {
    console.error('Please provide a task name');
    console.error('Usage: node generate-sop.js <任务名> [关键词...]');
    process.exit(1);
  }
  
  const taskName = args[0];
  const keywords = args.slice(1);
  
  // 检查是否有相似 SOP
  if (keywords.length > 0) {
    const similar = findSimilarSops(keywords);
    if (similar.length > 0) {
      console.log(`Found ${similar.length} similar SOPs:`);
      similar.forEach(s => console.log(`  - ${s.name}`));
      console.log('');
    }
  }
  
  // 从 STM 提取内容
  let extracted = { decisions: [], facts: [], preferences: [] };
  if (fs.existsSync(STM_FILE)) {
    const stmContent = fs.readFileSync(STM_FILE, 'utf-8');
    extracted = extractFromStm(stmContent);
  }
  
  // 生成 SOP
  const sop = generateSop(taskName, extracted);
  
  // 保存 SOP
  const safeName = taskName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sopPath = path.join(SKILLS_DIR, `${safeName}.md`);
  
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
  fs.writeFileSync(sopPath, sop);
  
  console.log(`SOP generated: ${sopPath}`);
  console.log(`ID: ${Date.now()}`);
}

main().catch(console.error);
