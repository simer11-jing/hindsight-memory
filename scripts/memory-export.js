#!/usr/bin/env node

/**
 * 导出/备份脚本
 * 导出为 JSON/Markdown，备份和恢复
 * 
 * 使用方法: 
 *   node memory-export.js --export json    导出为 JSON
 *   node memory-export.js --export md      导出为 Markdown
 *   node memory-export.js --backup         备份当前记忆
 *   node memory-export.js --restore <file> 恢复备份
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MEMORY_DIR = path.join(os.homedir(), '.openclaw/agents/main');
const BACKUP_DIR = path.join(MEMORY_DIR, 'backups');

/**
 * 获取所有记忆文件
 */
function getMemoryFiles() {
  const files = {
    main: path.join(MEMORY_DIR, 'MEMORY.md'),
    daily: path.join(MEMORY_DIR, 'memory'),
    config: path.join(MEMORY_DIR, 'config'),
    tools: path.join(MEMORY_DIR, 'TOOLS.md'),
    agents: path.join(MEMORY_DIR, 'AGENTS.md'),
    soul: path.join(MEMORY_DIR, 'SOUL.md'),
    user: path.join(MEMORY_DIR, 'USER.md')
  };
  
  const existing = {};
  for (const [name, filePath] of Object.entries(files)) {
    if (fs.existsSync(filePath)) {
      existing[name] = {
        path: filePath,
        stat: fs.statSync(filePath),
        content: fs.readFileSync(filePath, 'utf-8')
      };
    }
  }
  
  return existing;
}

/**
 * 导出为 JSON
 */
function exportJSON(outputPath) {
  const files = getMemoryFiles();
  
  const exportData = {
    version: '1.0',
    exported: new Date().toISOString(),
    machine: os.hostname(),
    user: os.userInfo().username,
    files: {}
  };
  
  for (const [name, data] of Object.entries(files)) {
    exportData.files[name] = {
      path: data.path,
      size: data.stat.size,
      modified: data.stat.mtime.toISOString(),
      content: data.content
    };
  }
  
  const json = JSON.stringify(exportData, null, 2);
  fs.writeFileSync(outputPath, json, 'utf-8');
  
  console.log(`✅ 已导出 JSON 到: ${outputPath}`);
  console.log(`   文件数: ${Object.keys(files).length}`);
  console.log(`   大小: ${(json.length / 1024).toFixed(2)} KB`);
}

/**
 * 导出为 Markdown
 */
function exportMarkdown(outputPath) {
  const files = getMemoryFiles();
  
  let md = '# OpenClaw 记忆导出\n\n';
  md += `> 导出时间: ${new Date().toISOString()}\n\n`;
  md += `---\n\n`;
  
  for (const [name, data] of Object.entries(files)) {
    md += `## ${name.toUpperCase()}\n\n`;
    md += `> 文件: ${data.path}\n`;
    md += `> 大小: ${(data.stat.size / 1024).toFixed(2)} KB\n`;
    md += `> 修改时间: ${data.stat.mtime.toISOString()}\n\n`;
    md += '```\n';
    md += data.content + '\n';
    md += '```\n\n';
    md += '---\n\n';
  }
  
  fs.writeFileSync(outputPath, md, 'utf-8');
  
  console.log(`✅ 已导出 Markdown 到: ${outputPath}`);
  console.log(`   文件数: ${Object.keys(files).length}`);
  console.log(`   大小: ${(md.length / 1024).toFixed(2)} KB`);
}

/**
 * 创建备份
 */
function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `memory-backup-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  fs.mkdirSync(backupPath, { recursive: true });
  
  const files = getMemoryFiles();
  
  for (const [name, data] of Object.entries(files)) {
    const destPath = path.join(backupPath, `${name}.md`);
    fs.copyFileSync(data.path, destPath);
  }
  
  // 创建元数据
  const meta = {
    version: '1.0',
    created: new Date().toISOString(),
    files: Object.keys(files)
  };
  fs.writeFileSync(
    path.join(backupPath, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf-8'
  );
  
  // 打包为压缩包
  const tarPath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);
  
  // 使用系统 tar 命令
  const { execSync } = require('child_process');
  try {
    execSync(`cd "${BACKUP_DIR}" && tar -czf "${backupName}.tar.gz" "${backupName}"`, {
      stdio: 'ignore'
    });
    
    // 删除临时目录
    fs.rmSync(backupPath, { recursive: true });
    
    console.log(`✅ 备份完成: ${tarPath}`);
  } catch (e) {
    console.log(`📁 备份保存到: ${backupPath}`);
  }
  
  return backupPath;
}

/**
 * 列出备份
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('❌ 暂无备份');
    return;
  }
  
  const files = fs.readdirSync(BACKUP_DIR);
  const backups = files.filter(f => f.startsWith('memory-backup-'));
  
  if (backups.length === 0) {
    console.log('❌ 暂无备份');
    return;
  }
  
  console.log(`
╔════════════════════════════════════════╗
║   可用备份列表                         ║
╚════════════════════════════════════════╝
`);
  
  for (const backup of backups.sort().reverse()) {
    const stats = fs.statSync(path.join(BACKUP_DIR, backup));
    const date = stats.mtime.toLocaleString('zh-CN');
    const size = (stats.size / 1024).toFixed(1);
    console.log(`  📦 ${backup}`);
    console.log(`     大小: ${size} KB | 日期: ${date}`);
    console.log('');
  }
}

/**
 * 恢复备份
 */
function restoreBackup(backupPath) {
  let sourcePath = backupPath;
  
  // 如果是压缩包，先解压
  if (backupPath.endsWith('.tar.gz')) {
    const { execSync } = require('child_process');
    const dir = path.dirname(backupPath);
    const base = path.basename(backupPath, '.tar.gz');
    
    execSync(`cd "${dir}" && tar -xzf "${path.basename(backupPath)}"`, {
      stdio: 'ignore'
    });
    
    sourcePath = path.join(dir, base);
  }
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 备份不存在: ${sourcePath}`);
    return;
  }
  
  // 读取元数据
  const metaPath = path.join(sourcePath, 'meta.json');
  let meta = { files: ['main'] };
  
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  }
  
  console.log(`📋 恢复文件: ${meta.files.join(', ')}`);
  
  for (const file of meta.files) {
    const srcFile = path.join(sourcePath, `${file}.md`);
    const destFile = path.join(MEMORY_DIR, `${file}.md`);
    
    if (fs.existsSync(srcFile)) {
      // 备份当前文件
      if (fs.existsSync(destFile)) {
        const backupNow = destFile + '.backup';
        fs.copyFileSync(destFile, backupNow);
        console.log(`  ✓ 已备份当前: ${file}.md -> ${file}.md.backup`);
      }
      
      // 恢复
      fs.copyFileSync(srcFile, destFile);
      console.log(`  ✓ 已恢复: ${file}.md`);
    }
  }
  
  console.log('\n✅ 恢复完成！');
  
  // 清理临时目录
  if (backupPath.endsWith('.tar.gz')) {
    fs.rmSync(sourcePath, { recursive: true });
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════╗
║   MEMORY 导出/备份工具 v1.0            ║
╚════════════════════════════════════════╝

使用方法:
  node memory-export.js --export json    导出为 JSON
  node memory-export.js --export md      导出为 Markdown
  node memory-export.js --backup         创建备份
  node memory-export.js --list           列出备份
  node memory-export.js --restore <path> 恢复备份

示例:
  node memory-export.js --export json
  node memory-export.js --export md ./backup.md
  node memory-export.js --backup
  node memory-export.js --list
  node memory-export.js --restore backups/memory-backup-2026-04-11.tar.gz
`);
    process.exit(0);
  }
  
  let exportType = null;
  let exportPath = null;
  let action = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--export':
        exportType = args[++i];
        exportPath = args[++i] || null;
        break;
      case '--backup':
        action = 'backup';
        break;
      case '--list':
        action = 'list';
        break;
      case '--restore':
        action = 'restore';
        exportPath = args[++i];
        break;
      case '--help':
        main();
        return;
    }
  }
  
  // 执行操作
  if (exportType) {
    if (!exportPath) {
      const timestamp = new Date().toISOString().slice(0, 10);
      exportPath = path.join(os.homedir(), `memory-export-${timestamp}.${exportType}`);
    }
    
    if (exportType === 'json') {
      exportJSON(exportPath);
    } else if (exportType === 'md') {
      exportMarkdown(exportPath);
    } else {
      console.error(`❌ 不支持的格式: ${exportType}`);
      console.log('支持: json, md');
      process.exit(1);
    }
  } else if (action === 'backup') {
    console.log(`
╔════════════════════════════════════════╗
║   创建记忆备份                         ║
╚════════════════════════════════════════╝
`);
    createBackup();
  } else if (action === 'list') {
    listBackups();
  } else if (action === 'restore') {
    if (!exportPath) {
      console.error('❌ 请指定要恢复的备份文件');
      process.exit(1);
    }
    restoreBackup(exportPath);
  }
}

main();