/**
 * multi-agent/index.js - 跨 Agent 记忆共享入口
 */

const AgentContext = require('./agent-context');

function forAgent(agentId, options = {}) {
  return new AgentContext(agentId, options);
}

function currentAgent() {
  const agentId = process.env.OPENCLAW_AGENT_ID || 'main';
  return new AgentContext(agentId);
}

function teamContext() {
  return new AgentContext('shared', {
    baseDir: process.env.OPENCLAW_BASE_DIR || `${process.env.HOME}/.openclaw/agents`
  });
}

module.exports = {
  AgentContext,
  forAgent,
  currentAgent,
  teamContext
};
