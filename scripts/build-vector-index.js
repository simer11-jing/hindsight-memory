#!/usr/bin/env node
/**
 * 向量索引管理脚本
 * 
 * 用法：
 *   node build-vector-index.js              # 全量重建
 *   node build-vector-index.js --clean      # 清理过期条目
 *   node build-vector-index.js --compact     # 压缩稀疏层
 */

const { AgentContext } = require('../lib/multi-agent/index.js');

const MODE = process.argv.includes('--clean') ? 'clean' :
             process.argv.includes('--compact') ? 'compact' : 'build';

async function main() {
  console.log(`=== 向量索引管理 (${MODE}) ===`);
  
  const ctx = new AgentContext('index-manager');
  
  if (MODE === 'clean') {
    console.log('🧹 清理过期索引条目...');
    const result = await ctx.cleanVectorIndex();
    console.log(`✅ 清理完成: 移除 ${result.cleaned} 条，剩余 ${result.remaining} 条`);
  } else if (MODE === 'compact') {
    console.log('📦 压缩稀疏记忆层...');
    const result = await ctx.compact(50);
    for (const [layer, stats] of Object.entries(result)) {
      console.log(`  ${layer}: ${stats.action}（保留${stats.kept}条）`);
    }
    console.log('✅ 压缩完成');
  } else {
    console.log('📦 重建向量索引...');
    const layers = ['mentalModels', 'observations', 'worldFacts', 'experiences'];
    await ctx.buildVectorIndex(layers);
    console.log('✅ 索引重建完成');
  }
}

main().catch(e => {
  console.error('失败:', e.message);
  process.exit(1);
});
