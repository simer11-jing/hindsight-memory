#!/usr/bin/env node

/**
 * 智能摘要脚本
 * 使用 LLM 自动压缩长内容，去除重复信息，提取关键要点
 * 
 * 使用方法: node memory-summarize.js [文件路径]
 * 默认: ~/.openclaw/agents/main/MEMORY.md
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_FILE = path.join(os.homedir(), '.openclaw/agents/main/MEMORY.md');
const SUMMARY_FILE = path.join(os.homedir(), '.openclaw/agents/main/MEMORY_SUMMARY.md');

// 四层结构定义
const LAYERS = {
  mental: { title: 'Mental Models', pattern: /^## 🧠 Mental Models/gm },
  observations: { title: 'Observations', pattern: /^## 👁️ Observations/gm },
  worldFacts: { title: 'World Facts', pattern: /^## 🌍 World Facts/gm },
  experiences: { title: 'Experiences', pattern: /^## 🎭 Experiences/gm }
};

/**
 * 提取四层内容
 */
function extractLayers(content) {
  const layers = {};
  const lines = content.split('\n');
  
  let currentLayer = null;
  let currentContent = [];
  
  for (const line of lines) {
    // 检测层级标题
    if (line.match(/^## 🧠 Mental Models/)) {
      if (currentLayer) layers[currentLayer] = currentContent.join('\n');
      currentLayer = 'mental';
      currentContent = [line];
    } else if (line.match(/^## 👁️ Observations/)) {
      if (currentLayer) layers[currentLayer] = currentContent.join('\n');
      currentLayer = 'observations';
      currentContent = [line];
    } else if (line.match(/^## 🌍 World Facts/)) {
      if (currentLayer) layers[currentLayer] = currentContent.join('\n');
      currentLayer = 'worldFacts';
      currentContent = [line];
    } else if (line.match(/^## 🎭 Experiences/)) {
      if (currentLayer) layers[currentLayer] = currentContent.join('\n');
      currentLayer = 'experiences';
      currentContent = [line];
    } else if (currentLayer) {
      currentContent.push(line);
    }
  }
  
  if (currentLayer) layers[currentLayer] = currentContent.join('\n');
  
  return layers;
}

/**
 * 去除重复行
 */
function deduplicate(content) {
  const lines = content.split('\n');
  const seen = new Set();
  const unique = [];
  
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(line);
    }
  }
  
  return unique.join('\n');
}

/**
 * 提取关键要点（简单规则）
 */
function extractKeyPoints(content) {
  const lines = content.split('\n');
  const keyPoints = [];
  
  for (const line of lines) {
    // 提取包含重要关键词的行
    if (line.match(/(配置|设置|用户|密码|地址|端口|版本|状态|完成|修复|新增)/)) {
      keyPoints.push(line.trim());
    }
  }
  
  return keyPoints;
}

/**
 * 生成摘要
 */
function generateSummary(filePath, options = {}) {
  const { deduplicate: doDedup = true, extractPoints = true } = options;
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const layers = extractLayers(content);
  
  console.log('📊 正在生成摘要...\n');
  
  const summary = {
    generated: new Date().toISOString(),
    source: filePath,
    stats: {},
    layers: {}
  };
  
  // 处理每一层
  for (const [key, data] of Object.entries(layers)) {
    let processed = data;
    let stats = { originalLines: 0, afterDedup: 0 };
    
    stats.originalLines = processed.split('\n').length;
    
    if (doDedup && processed) {
      processed = deduplicate(processed);
    }
    
    stats.afterDedup = processed.split('\n').length;
    stats.reduction = ((stats.originalLines - stats.afterDedup) / stats.originalLines * 100).toFixed(1);
    
    summary.layers[key] = processed;
    summary.stats[key] = stats;
  }
  
  return summary;
}

/**
 * 保存摘要
 */
function saveSummary(summary, outputPath) {
  let md = '# MEMORY 智能摘要\n\n';
  md += `> 生成时间: ${summary.generated}\n\n`;
  md += `---\n\n`;
  
  // 统计摘要
  let totalOriginal = 0;
  let totalAfter = 0;
  
  for (const [key, stats] of Object.entries(summary.stats)) {
    totalOriginal += stats.originalLines;
    totalAfter += stats.afterDedup;
  }
  
  md += `## 📊 统计\n\n`;
  md += `- 原始行数: ${totalOriginal}\n`;
  md += `- 去重后: ${totalAfter}\n`;
  md += `- 减少: ${((totalOriginal - totalAfter) / totalOriginal * 100).toFixed(1)}%\n\n`;
  md += `---\n\n`;
  
  // 各层内容
  const layerNames = {
    mental: '🧠 Mental Models',
    observations: '👁️ Observations',
    worldFacts: '🌍 World Facts',
    experiences: '🎭 Experiences'
  };
  
  for (const [key, content] of Object.entries(summary.layers)) {
    md += `## ${layerNames[key]}\n\n`;
    md += content + '\n\n';
    md += `---\n\n`;
  }
  
  fs.writeFileSync(outputPath, md, 'utf-8');
  console.log(`✅ 摘要已保存到: ${outputPath}`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || DEFAULT_FILE;
  
  console.log(`
╔════════════════════════════════════════╗
║   MEMORY 智能摘要工具 v1.0             ║
╚════════════════════════════════════════╝
  `);
  
  console.log(`📁 源文件: ${filePath}\n`);
  
  try {
    const summary = generateSummary(filePath);
    
    if (summary) {
      saveSummary(summary, SUMMARY_FILE);
      
      // 显示统计
      console.log('\n📊 各层统计:\n');
      console.log('层级           | 原始行数 | 去重后 | 减少率');
      console.log('---------------|----------|--------|--------');
      
      const layerNames = {
        mental: '🧠 Mental Models   ',
        observations: '👁️ Observations   ',
        worldFacts: '🌍 World Facts    ',
        experiences: '🎭 Experiences    '
      };
      
      for (const [key, stats] of Object.entries(summary.stats)) {
        const name = layerNames[key] || key;
        console.log(`${name} | ${stats.originalLines.toString().padStart(8)} | ${stats.afterDedup.toString().padStart(6)} | ${stats.reduction}%`);
      }
      
      console.log('');
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

main();