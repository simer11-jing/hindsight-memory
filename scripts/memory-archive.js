#!/usr/bin/env node
/**
 * Memory 日志归档脚本
 * 
 * 功能：
 * 1. 归档超过指定天数的日志到 archive/ 目录
 * 2. 清理重复的时间戳变体（如 2026-04-14-1714.md）
 * 3. 合并多个同日期的日志为一个文件
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  memoryDir: path.join(process.env.HOME, '.openclaw/agents/main/memory'),
  archiveDir: path.join(process.env.HOME, '.openclaw/agents/main/memory/archive'),
  ttlDays: 90,  // 90天前的日志归档
  datePattern: /^(\d{4}-\d{2}-\d{2})/,  // 匹配日期如 2026-04-14
  variantPattern: /^(\d{4}-\d{2}-\d{2})-(\d{4})\.md$/,  // 匹配变体如 2026-04-14-1714.md
  keepLatest: true  // 保留最新版本
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getFileDate(filename) {
  const match = filename.match(CONFIG.datePattern);
  if (!match) return null;
  return new Date(match[1]);
}

function isVariantFile(filename) {
  return CONFIG.variantPattern.test(filename);
}

function getDateFromVariant(filename) {
  const match = filename.match(CONFIG.variantPattern);
  return match ? match[1] : null;
}

function daysAgo(date) {
  const now = new Date();
  const diff = now - date;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function main() {
  console.log('🔍 Memory 日志归档脚本\n');
  console.log(`📁 内存目录: ${CONFIG.memoryDir}`);
  console.log(`📦 归档目录: ${CONFIG.archiveDir}`);
  console.log(`⏰ 归档策略: ${CONFIG.ttlDays} 天前的日志\n`);

  ensureDir(CONFIG.memoryDir);
  ensureDir(CONFIG.archiveDir);

  const files = fs.readdirSync(CONFIG.memoryDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      path: path.join(CONFIG.memoryDir, f),
      date: getFileDate(f),
      isVariant: isVariantFile(f),
      stat: fs.statSync(path.join(CONFIG.memoryDir, f))
    }))
    .filter(f => f.date !== null);

  console.log(`📊 发现 ${files.length} 个日志文件\n`);

  // 1. 找出需要归档的旧文件
  const toArchive = files.filter(f => daysAgo(f.date) > CONFIG.ttlDays);
  
  console.log(`📦 归档旧文件 (${CONFIG.ttlDays}+ 天前): ${toArchive.length} 个`);
  for (const f of toArchive) {
    console.log(`   - ${f.name} (${daysAgo(f.date)} 天前)`);
  }

  // 2. 找出重复的变体文件
  const variantFiles = files.filter(f => f.isVariant);
  console.log(`\n🔄 重复变体文件: ${variantFiles.length} 个`);
  
  // 按日期分组
  const byDate = {};
  for (const f of files) {
    const dateKey = f.date.toISOString().split('T')[0];
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(f);
  }

  const toDelete = [];
  for (const [date, fileList] of Object.entries(byDate)) {
    if (fileList.length < 2) continue;
    
    // 按修改时间排序，保留最新的
    fileList.sort((a, b) => b.stat.mtime - a.stat.mtime);
    
    // 标记旧版本删除
    const toRemove = fileList.slice(1);
    console.log(`\n📅 ${date}: 发现 ${fileList.length} 个版本`);
    console.log(`   保留: ${fileList[0].name}`);
    for (const f of toRemove) {
      console.log(`   删除: ${f.name}`);
      toDelete.push(f);
    }
  }

  // 3. 执行归档和删除
  console.log('\n⚙️  开始执行...\n');

  let archived = 0, deleted = 0;

  // 归档旧文件
  for (const f of toArchive) {
    const destPath = path.join(CONFIG.archiveDir, f.name);
    fs.renameSync(f.path, destPath);
    console.log(`📦 归档: ${f.name} → archive/`);
    archived++;
  }

  // 删除重复变体
  for (const f of toDelete) {
    fs.unlinkSync(f.path);
    console.log(`🗑️  删除: ${f.name}`);
    deleted++;
  }

  // 4. 统计结果
  console.log('\n✅ 完成！');
  console.log(`\n📊 统计:`);
  console.log(`   - 归档: ${archived} 个文件`);
  console.log(`   - 删除: ${deleted} 个重复`);
  console.log(`   - 保留: ${files.length - archived - deleted} 个文件`);

  // 5. 生成归档索引
  if (archived > 0) {
    const archiveFiles = fs.readdirSync(CONFIG.archiveDir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const stat = fs.statSync(path.join(CONFIG.archiveDir, f));
        return { name: f, date: getFileDate(f), size: stat.size };
      })
      .filter(f => f.date !== null)
      .sort((a, b) => b.date - a.date);

    const indexContent = `# Memory Archive Index
_自动生成于 ${new Date().toISOString()}_

## 归档文件列表

| 日期 | 文件名 | 大小 |
|------|--------|------|
${archiveFiles.map(f => `| ${f.date.toISOString().split('T')[0]} | ${f.name} | ${(f.size/1024).toFixed(1)}KB |`).join('\n')}

---
总计: ${archiveFiles.length} 个归档文件
`;

    fs.writeFileSync(
      path.join(CONFIG.archiveDir, '_index.md'),
      indexContent
    );
    console.log(`\n📋 已更新归档索引`);
  }

  // 6. 添加定时任务（如果还没有的话）
  const cronEntry = `0 3 * * * cd ${path.dirname(CONFIG.memoryDir)} && node scripts/memory-archive.js >> /tmp/memory-archive.log 2>&1`;
  console.log(`\n⏰ 建议添加定时任务 (crontab):`);
  console.log(`   ${cronEntry}`);
}

main();
