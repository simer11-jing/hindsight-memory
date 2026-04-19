#!/usr/bin/env node
/**
 * memory-team.js - 团队共享记忆 CLI
 * 
 * 用法：
 *   node memory-team.js read                    # 读取所有共享记忆
 *   node memory-team.js read --layer mentalModels  # 读指定层
 *   node memory-team.js write "记忆内容" --layer worldFacts  # 写入共享记忆
 *   node memory-team.js query "查询内容"        # 团队查询
 *   node memory-team.js stats                  # 团队统计
 *   node memory-team.js agents                 # 列出所有 Agent
 */

const path = require('path');
const fs = require('fs');

// AgentContext 路径
const libPath = path.join(__dirname, '..', 'lib', 'multi-agent');
const AgentContext = require(path.join(libPath, 'agent-context'));

// 解析命令行参数
const args = process.argv.slice(2);

function getArg(name, short = null) {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  if (short !== null) {
    const sIdx = args.indexOf(`-${short}`);
    if (sIdx !== -1 && sIdx + 1 < args.length) return args[sIdx + 1];
  }
  return null;
}

function hasArg(name) {
  return args.includes(`--${name}`) || args.includes(`-${name[0]}`);
}

// 从环境变量或目录推断当前 Agent
const CURRENT_AGENT = process.env.OPENCLAW_AGENT_ID || 
  path.basename(path.dirname(process.argv[1])) || 
  'main';

const context = new AgentContext(CURRENT_AGENT);

async function cmdRead() {
  const layer = getArg('layer');
  const type = hasArg('shared') ? 'shared' : null;
  
  if (layer) {
    if (type === 'shared' || !hasArg('private')) {
      const entries = await context.readShared(layer);
      console.log(`\n📖 [共享] ${layer} (${entries.length} 条)\n`);
      for (const e of entries) {
        console.log(`  👤 ${e.agent || 'unknown'}  ${e.timestamp || ''}`);
        console.log(`     ${e.content}`);
        console.log('');
      }
    }
  } else {
    // 读所有层
    const all = await context.readAllShared();
    for (const [l, entries] of Object.entries(all)) {
      if (entries.length > 0) {
        console.log(`\n📖 [共享] ${l} (${entries.length} 条)\n`);
        for (const e of entries.slice(0, 3)) {
          console.log(`  👤 ${e.agent} | ${e.content.substring(0, 80)}...`);
        }
        if (entries.length > 3) console.log(`  ... 还有 ${entries.length - 3} 条`);
      }
    }
  }
}

async function cmdWrite() {
  const content = args[0]; // 第一个非选项参数
  if (!content) {
    console.error('❌ 请提供内容: memory-team.js write "记忆内容"');
    process.exit(1);
  }
  
  const layer = getArg('layer') || 'observations';
  const shared = !hasArg('private');
  const tags = (getArg('tags') || '').split(',').filter(t => t.trim());
  const confidence = parseFloat(getArg('confidence') || '0.8');
  
  if (shared) {
    const result = await context.writeShared(layer, content, { tags, confidence });
    console.log(`✅ 已写入 [共享] ${layer} by ${CURRENT_AGENT}`);
    console.log(`   ${result.content.substring(0, 60)}...`);
  } else {
    const result = await context.writePrivate(layer, content, { tags, confidence });
    console.log(`✅ 已写入 [私有] ${layer} by ${CURRENT_AGENT}`);
  }
}

async function cmdQuery() {
  const query = args[0];
  if (!query) {
    console.error('❌ 请提供查询: memory-team.js query "查询内容"');
    process.exit(1);
  }
  
  const agents = getArg('agents')?.split(',');
  const layers = getArg('layer')?.split(',') || null;
  const limit = parseInt(getArg('limit') || '10');
  
  const results = await context.queryTeam(query, { agents, layers, limit });
  
  console.log(`\n🔍 查询: "${query}" (${results.length} 条结果)\n`);
  for (const r of results) {
    const badge = {
      mentalModels: '🧠',
      worldFacts: '🌍',
      observations: '👁️',
      experiences: '🎭'
    }[r.layer] || '📝';
    
    console.log(`${badge} [${r.layer}] 评分: ${(r.score * 100).toFixed(0)}%`);
    console.log(`   👤 ${r.agent} | ${r.content.substring(0, 100)}`);
    console.log('');
  }
}

async function cmdStats() {
  const stats = await context.teamStats();
  
  console.log(`\n📊 团队记忆统计\n`);
  console.log(`   🤖 Agent 数量: ${stats.agents.length}`);
  console.log(`   🤖 Agents: ${stats.agents.join(', ')}`);
  console.log(`   📝 总贡献: ${stats.totalContributions} 条\n`);
  
  for (const [layer, count] of Object.entries(stats.layers)) {
    const emoji = { mentalModels: '🧠', worldFacts: '🌍', observations: '👁️', experiences: '🎭' }[layer] || '📝';
    console.log(`   ${emoji} ${layer}: ${count} 条`);
  }
  console.log('');
}

async function cmdAgents() {
  const agentsDir = path.join(context.baseDir);
  const agents = fs.readdirSync(agentsDir).filter(
    d => fs.statSync(path.join(agentsDir, d)).isDirectory() && !d.startsWith('.')
  );
  
  console.log(`\n🤖 可用 Agent (${agents.length}):\n`);
  for (const agent of agents) {
    const sharedPath = path.join(agentsDir, agent, 'shared');
    const sharedExists = fs.existsSync(sharedPath);
    const marker = agent === CURRENT_AGENT ? ' ◀◀ 当前' : '';
    console.log(`   • ${agent}${marker}${sharedExists ? ' [已接入共享]' : ''}`);
  }
  console.log('');
}

// 主命令路由
const cmd = args[0];

(async () => {
  try {
    switch (cmd) {
      case 'read':
        await cmdRead();
        break;
      case 'write':
        await cmdWrite();
        break;
      case 'query':
      case 'search':
        await cmdQuery();
        break;
      case 'stats':
      case 'status':
        await cmdStats();
        break;
      case 'agents':
      case 'list':
        await cmdAgents();
        break;
      case 'help':
        printHelp();
        break;
      default:
        if (!cmd) {
          await cmdStats();
        } else {
          console.error(`❌ 未知命令: ${cmd}`);
          printHelp();
          process.exit(1);
        }
    }
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
})();

function printHelp() {
  console.log(`
🤖 hindsight-memory 团队记忆 CLI

用法:
  memory-team.js <命令> [参数]

命令:
  read [--layer <层>] [--private]    读取共享/私有记忆
  write <内容> --layer <层>          写入记忆（默认共享）
  query <文本>                       团队语义查询
  stats                             团队记忆统计
  agents                            列出所有 Agent

示例:
  memory-team.js read --layer mentalModels
  OPENCLAW_AGENT_ID=analyst memory-team.js write "英超保级队主场强势" --layer observations --tags 竞彩
  memory-team.js query "用户偏好什么模型"
  memory-team.js stats
`);
}
