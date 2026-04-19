/**
 * multi-agent/index.js - 跨 Agent 记忆共享入口
 * 
 * 导出 AgentContext 和团队协作工具
 */

const { AgentContext } = require('./agent-context');

/**
 * 获取指定 Agent 的上下文
 */
function forAgent(agentId, options = {}) {
  return new AgentContext(agentId, options);
}

/**
 * 获取当前 Agent 的上下文（从环境变量推断）
 */
function currentAgent() {
  const agentId = process.env.OPENCLAW_AGENT_ID || 'main';
  return new AgentContext(agentId);
}

/**
 * 获取团队共享记忆管理器
 */
function teamContext() {
  return new AgentContext('shared', {
    baseDir: process.env.OPENCLAW_BASE_DIR || 
      `${process.env.HOME}/.openclaw/agents`
  });
}

module.exports = {
  AgentContext,
  forAgent,
  currentAgent,
  teamContext
};
