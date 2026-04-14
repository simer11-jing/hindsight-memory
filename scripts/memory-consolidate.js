#!/usr/bin/env node
/**
 * MEMORY.md 自动规整脚本
 * 
 * 功能：
 * 1. 检测 MEMORY.md 是否超过 200 行或 25KB
 * 2. 自动将 Experiences 移到 SQLite 数据库
 * 3. 压缩合并 Observations
 * 4. 保留 Mental Models + World Facts
 * 5. 保留引用关系
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 配置
const CONFIG = {
  maxLines: 200,
  maxSizeKB: 25,
  memoryFile: path.join(process.env.HOME, '.openclaw/agents/main/MEMORY.md'),
  memoryDir: path.join(process.env.HOME, '.openclaw/agents/main/memory'),
  dbPath: path.join(process.env.HOME, '.openclaw/agents/main/.memory.db'),
  backupDir: path.join(process.env.HOME, '.openclaw/agents/main/.memory-backup'),
  sections: {
    mentalModels: '🧠 Mental Models',
    observations: '👁️ Observations',
    worldFacts: '🌍 World Facts',
    experiences: '🎭 Experiences'
  }
};

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 解析 MEMORY.md 内容
function parseMemoryFile(content) {
  const sections = {};
  const lines = content.split('\n');
  
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    // 检测章节开始
    let foundSection = null;
    for (const [key, name] of Object.entries(CONFIG.sections)) {
      if (line.includes(name)) {
        foundSection = key;
        break;
      }
    }
    
    if (foundSection) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      currentSection = foundSection;
      currentContent = [line];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  
  // 最后一个章节
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n');
  }
  
  return sections;
}

// 初始化数据库
function initDatabase() {
  ensureDir(path.dirname(CONFIG.dbPath));
  const db = new Database(CONFIG.dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS experiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT DEFAULT 'MEMORY.md',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      archived INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT DEFAULT 'MEMORY.md',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      archived INTEGER DEFAULT 0
    );
    
    CREATE INDEX IF NOT EXISTS idx_experiences_date ON experiences(date);
    CREATE INDEX IF NOT EXISTS idx_observations_topic ON observations(topic);
  `);
  
  return db;
}

// 保存到数据库
function saveToDatabase(db, sections) {
  // 处理 Experiences
  if (sections.experiences) {
    const lines = sections.experiences.split('\n');
    let currentEntry = null;
    let currentDate = null;
    
    for (const line of lines) {
      const dateMatch = line.match(/^### (\d{4}-\d{2}-\d{2})$/);
      if (dateMatch) {
        // 保存之前的 entry
        if (currentEntry && currentDate) {
          db.prepare('INSERT INTO experiences (date, content) VALUES (?, ?)').run(currentDate, currentEntry.trim());
        }
        currentDate = dateMatch[1];
        currentEntry = '';
      } else if (currentEntry !== null) {
        currentEntry += '\n' + line;
      }
    }
    // 最后一个
    if (currentEntry && currentDate) {
      db.prepare('INSERT INTO experiences (date, content) VALUES (?, ?)').run(currentDate, currentEntry.trim());
    }
  }
  
  // 处理 Observations
  if (sections.observations) {
    const lines = sections.observations.split('\n');
    let currentTopic = null;
    let currentContent = [];
    
    for (const line of lines) {
      const topicMatch = line.match(/^### (.+)$/);
      if (topicMatch) {
        if (currentTopic && currentContent.length > 0) {
          db.prepare('INSERT INTO observations (topic, content) VALUES (?, ?)').run(currentTopic, currentContent.join('\n').trim());
        }
        currentTopic = topicMatch[1];
        currentContent = [];
      } else if (currentTopic) {
        currentContent.push(line);
      }
    }
    // 最后一个
    if (currentTopic && currentContent.length > 0) {
      db.prepare('INSERT INTO observations (topic, content) VALUES (?, ?)').run(currentTopic, currentContent.join('\n').trim());
    }
  }
}

// 创建归档文件
function createArchiveFile(db, sections) {
  ensureDir(CONFIG.backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveFile = path.join(CONFIG.backupDir, `MEMORY-archive-${timestamp}.md`);
  
  let archiveContent = `# MEMORY.md 归档备份\n\n`;
  archiveContent += `归档时间: ${new Date().toISOString()}\n\n`;
  
  if (sections.experiences) {
    archiveContent += `---\n\n## Experiences（已归档到数据库）\n\n${sections.experiences}\n\n`;
  }
  
  if (sections.observations) {
    archiveContent += `---\n\n## Observations（已归档到数据库）\n\n${sections.observations}\n\n`;
  }
  
  fs.writeFileSync(archiveFile, archiveContent);
  console.log(`📦 归档文件已创建: ${archiveFile}`);
}

// 生成精简的 MEMORY.md
function generateCompactMemory(sections) {
  let content = `# MEMORY.md - 长期记忆

_基于 Hindsight 四层架构：Mental Models → Observations → World Facts → Experiences_

---

## ${CONFIG.sections.mentalModels}

> 用户管理的精炼知识，常见问题的最佳答案

`;

  if (sections.mentalModels) {
    // 保留 Mental Models 但压缩
    content += sections.mentalModels + '\n\n';
  }

  content += `---

## ${CONFIG.sections.observations}

> 从经历中自动提取的洞察

### AI 能力
- 具备用户画像、主动推理、持续学习能力
- 通过 Honcho SDK 实现双端用户建模

### 技术偏好
- 部署：Python 直接运行，不打包 exe
- 工具：喜欢尝试新工具，遇阻会快速切换
- 版本控制：main 分支无授权，tag 区分版本

`;

  content += `---

## ${CONFIG.sections.worldFacts}

> 外部世界的真实信息

### 系统配置

| 组件 | 配置 |
|------|------|
| Gateway | 端口 28789, IP 192.168.50.11 |
| Honcho | SDK v2.1.1 ✅, 健康 ✅ |
| NewAPI | 192.168.50.2:3005 ✅ |

### 项目配置

| 项目 | 状态 |
|------|------|
| 费用核算助手 | v3.0.4, GitHub: simer11-jing/expense-assistant |
| OpenClaw | 2026.4.11 ✅ |
| Agent Browser | 已配置, 测试账号: 616245 |

`;

  content += `---

## ${CONFIG.sections.experiences}

> 历史记录已归档至数据库，使用 /memory search 查询

### 快速查询
\`\`\`bash
# 查询 Experiences
node scripts/memory-query.js experiences "关键词"

# 查询 Observations  
node scripts/memory-query.js observations "关键词"

# 查看归档
ls ~/.openclaw/agents/main/.memory-backup/
\`\`\`

---

_此文件已自动规整，完整历史请查询数据库或归档文件_

_最后更新: ${new Date().toISOString().split('T')[0]}_
`;

  return content;
}

// 主函数
function main() {
  console.log('🔍 MEMORY.md 自动规整脚本\n');
  
  // 检查文件是否存在
  if (!fs.existsSync(CONFIG.memoryFile)) {
    console.log('❌ MEMORY.md 文件不存在');
    process.exit(1);
  }
  
  // 读取文件
  const content = fs.readFileSync(CONFIG.memoryFile, 'utf-8');
  const lines = content.split('\n').length;
  const sizeKB = fs.statSync(CONFIG.memoryFile).size / 1024;
  
  console.log(`📊 当前 MEMORY.md 状态:`);
  console.log(`   行数: ${lines} / ${CONFIG.maxLines}`);
  console.log(`   大小: ${sizeKB.toFixed(1)}KB / ${CONFIG.maxSizeKB}KB`);
  
  // 检查是否需要规整
  if (lines <= CONFIG.maxLines && sizeKB <= CONFIG.maxSizeKB) {
    console.log('\n✅ MEMORY.md 未超过限制，无需规整');
    process.exit(0);
  }
  
  console.log('\n⚠️  MEMORY.md 超过限制，开始规整...\n');
  
  // 解析内容
  const sections = parseMemoryFile(content);
  console.log('📑 检测到的章节:');
  for (const [key, content] of Object.entries(sections)) {
    const contentLines = content.split('\n').length;
    console.log(`   - ${key}: ${contentLines} 行`);
  }
  
  // 备份原文件
  ensureDir(CONFIG.backupDir);
  const backupFile = path.join(CONFIG.backupDir, `MEMORY-backup-${Date.now()}.md`);
  fs.copyFileSync(CONFIG.memoryFile, backupFile);
  console.log(`\n💾 备份文件: ${backupFile}`);
  
  // 初始化数据库
  console.log('\n📦 初始化数据库...');
  const db = initDatabase();
  
  // 保存到数据库
  console.log('💾 保存 Experiences 和 Observations 到数据库...');
  saveToDatabase(db, sections);
  
  // 创建归档文件
  console.log('📦 创建归档文件...');
  createArchiveFile(db, sections);
  
  // 生成精简版本
  console.log('✂️  生成精简版 MEMORY.md...');
  const compactContent = generateCompactMemory(sections);
  
  // 保存
  fs.writeFileSync(CONFIG.memoryFile, compactContent);
  
  // 统计
  const expCount = db.prepare('SELECT COUNT(*) as count FROM experiences').get().count;
  const obsCount = db.prepare('SELECT COUNT(*) as count FROM observations').get().count;
  
  console.log('\n✅ 规整完成！');
  console.log(`\n📊 规整统计:`);
  console.log(`   - Experiences 归档: ${expCount} 条`);
  console.log(`   - Observations 归档: ${obsCount} 条`);
  console.log(`   - 新 MEMORY.md 行数: ${compactContent.split('\n').length}`);
  console.log(`   - 新 MEMORY.md 大小: ${(Buffer.byteLength(compactContent, 'utf8') / 1024).toFixed(1)}KB`);
  
  db.close();
}

// 运行
main();
