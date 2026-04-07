#!/usr/bin/env node

/**
 * 记忆审查工具
 * 
 * 功能：
 * - 识别重复内容
 * - 发现过时信息
 * - 检查容量使用
 * - 建议优化方向
 */

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = process.argv[2] || path.join(process.env.HOME, '.openclaw/agents/main/MEMORY.md');
const MAX_LINES = 200;
const MAX_SIZE_KB = 25;

function analyzeMemory(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('❌ 文件不存在:', filePath);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const stats = fs.statSync(filePath);
  
  console.log('\n🔍 记忆审查报告');
  console.log('='.repeat(60));
  
  // 1. 容量检查
  console.log('\n📊 容量统计');
  console.log('─'.repeat(60));
  const lineCount = lines.length;
  const sizeKB = (stats.size / 1024).toFixed(2);
  const lineUsage = ((lineCount / MAX_LINES) * 100).toFixed(1);
  const sizeUsage = ((stats.size / (MAX_SIZE_KB * 1024)) * 100).toFixed(1);
  
  console.log(`行数: ${lineCount} / ${MAX_LINES} (${lineUsage}%)`);
  console.log(`大小: ${sizeKB}KB / ${MAX_SIZE_KB}KB (${sizeUsage}%)`);
  
  if (lineUsage > 90 || sizeUsage > 90) {
    console.log('⚠️  容量接近上限，建议清理');
  } else if (lineUsage > 75 || sizeUsage > 75) {
    console.log('⚠️  容量较满，建议优化');
  } else {
    console.log('✅ 容量正常');
  }
  
  // 2. 结构分析
  console.log('\n🏗️  结构分析');
  console.log('─'.repeat(60));
  
  const sections = {
    'Mental Models': 0,
    'Observations': 0,
    'World Facts': 0,
    'Experiences': 0
  };
  
  let currentSection = '';
  lines.forEach(line => {
    if (line.includes('Mental Models')) currentSection = 'Mental Models';
    else if (line.includes('Observations')) currentSection = 'Observations';
    else if (line.includes('World Facts')) currentSection = 'World Facts';
    else if (line.includes('Experiences')) currentSection = 'Experiences';
    
    if (currentSection && line.trim().startsWith('-')) {
      sections[currentSection]++;
    }
  });
  
  Object.entries(sections).forEach(([name, count]) => {
    const emoji = count > 0 ? '✅' : '⚠️ ';
    console.log(`${emoji} ${name}: ${count} 条`);
  });
  
  const totalItems = Object.values(sections).reduce((a, b) => a + b, 0);
  if (totalItems === 0) {
    console.log('⚠️  未检测到四层架构结构');
  }
  
  // 3. 重复内容检测
  console.log('\n🔍 重复内容检测');
  console.log('─'.repeat(60));
  
  const contentLines = lines
    .map(l => l.trim())
    .filter(l => l.length > 20 && !l.startsWith('#'));
  
  const duplicates = {};
  contentLines.forEach(line => {
    const normalized = line.toLowerCase().replace(/\s+/g, ' ');
    duplicates[normalized] = (duplicates[normalized] || 0) + 1;
  });
  
  const dupItems = Object.entries(duplicates)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
  
  if (dupItems.length > 0) {
    console.log(`⚠️  发现 ${dupItems.length} 处重复内容`);
    dupItems.slice(0, 3).forEach(([line, count]) => {
      console.log(`  - "${line.substring(0, 50)}..." (${count}次)`);
    });
  } else {
    console.log('✅ 未发现重复内容');
  }
  
  // 4. 过时内容检测
  console.log('\n📅 时间信息检测');
  console.log('─'.repeat(60));
  
  const datePattern = /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}/g;
  const dates = content.match(datePattern) || [];
  
  if (dates.length > 0) {
    console.log(`✅ 发现 ${dates.length} 个日期标记`);
    const now = new Date();
    const oldDates = dates.filter(d => {
      const date = new Date(d.replace(/[/年月]/g, '-'));
      const months = (now - date) / (1000 * 60 * 60 * 24 * 30);
      return months > 6;
    });
    
    if (oldDates.length > 0) {
      console.log(`⚠️  ${oldDates.length} 个日期超过6个月，可能需要更新`);
    }
  } else {
    console.log('ℹ️  未发现日期标记');
  }
  
  // 5. 优化建议
  console.log('\n💡 优化建议');
  console.log('─'.repeat(60));
  
  const suggestions = [];
  
  if (lineUsage > 80) {
    suggestions.push('清理过时信息，释放空间');
  }
  
  if (dupItems.length > 0) {
    suggestions.push('合并重复内容，精简记忆');
  }
  
  if (sections['Mental Models'] === 0) {
    suggestions.push('添加 Mental Models 层级，提炼核心智慧');
  }
  
  if (sections['Observations'] === 0) {
    suggestions.push('添加 Observations 层级，记录发现的模式');
  }
  
  if (dates.length === 0) {
    suggestions.push('添加时间标记，便于追溯');
  }
  
  if (suggestions.length > 0) {
    suggestions.forEach((s, i) => console.log(`${i + 1}. ${s}`));
  } else {
    console.log('✅ 记忆结构良好，继续保持！');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('审查完成！\n');
  
  return {
    lineCount,
    sizeKB: parseFloat(sizeKB),
    sections,
    duplicates: dupItems.length,
    suggestions: suggestions.length
  };
}

// 运行分析
analyzeMemory(MEMORY_FILE);
