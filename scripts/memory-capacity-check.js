#!/usr/bin/env node

/**
 * MEMORY.md 容量检查工具
 * 
 * 检查 MEMORY.md 文件是否超出容量限制：
 * - 最大 200 行
 * - 最大 25KB
 */

const fs = require('fs');
const path = require('path');

const MAX_LINES = 200;
const MAX_SIZE_KB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

function checkMemoryCapacity(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('❌ 文件不存在:', filePath);
    return { error: 'FILE_NOT_FOUND' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  const lineCount = lines.length;
  const lineUsage = ((lineCount / MAX_LINES) * 100).toFixed(1);
  const sizeUsage = ((stats.size / MAX_SIZE_BYTES) * 100).toFixed(1);
  
  const isOverLineLimit = lineCount > MAX_LINES;
  const isOverSizeLimit = stats.size > MAX_SIZE_BYTES;
  
  console.log('\n📊 MEMORY.md 统计');
  console.log('─'.repeat(50));
  console.log(`行数: ${lineCount} / ${MAX_LINES} (${lineUsage}%)`);
  console.log(`大小: ${sizeKB}KB / ${MAX_SIZE_KB}KB (${sizeUsage}%)`);
  
  let status = '✅ 正常';
  let warnings = [];
  
  if (isOverLineLimit) {
    status = '⚠️ 超出行数限制';
    warnings.push(`超出 ${lineCount - MAX_LINES} 行`);
  }
  
  if (isOverSizeLimit) {
    status = '⚠️ 超出大小限制';
    warnings.push(`超出 ${(stats.size - MAX_SIZE_BYTES) / 1024}KB`);
  }
  
  if (lineUsage > 80 || sizeUsage > 80) {
    status = '⚠️ 接近上限';
    warnings.push('建议清理或归档旧内容');
  }
  
  console.log(`状态: ${status}`);
  
  if (warnings.length > 0) {
    console.log('\n⚠️ 警告:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  console.log('─'.repeat(50));
  
  return {
    lineCount,
    lineLimit: MAX_LINES,
    lineUsage: parseFloat(lineUsage),
    sizeKB: parseFloat(sizeKB),
    sizeLimitKB: MAX_SIZE_KB,
    sizeUsage: parseFloat(sizeUsage),
    isOverLineLimit,
    isOverSizeLimit,
    status
  };
}

// 命令行参数
const filePath = process.argv[2] || path.join(process.env.HOME, '.openclaw/agents/main/MEMORY.md');

console.log('🔍 检查文件:', filePath);
const result = checkMemoryCapacity(filePath);

process.exit(result.isOverLineLimit || result.isOverSizeLimit ? 1 : 0);
