# 🧠 Hindsight Memory System

> 基于 5 层架构的 AI 智能体记忆系统，支持本地/云端向量检索 + **跨 Agent 记忆共享**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-blue.svg)](https://openclaw.ai)
[![Version](https://img.shields.io/badge/version-2.1.0-green.svg)](https://github.com/simer11-jing/hindsight-memory)

---

## ✨ 特性

- 🏗️ **5 层架构** - Ephemeral → Experiences → Observations → World Facts → Mental Models
- 💾 **持久化存储** - 文件级记忆，重启不丢失
- 🔍 **智能检索** - 关键词 + 语义向量混合搜索
- ☁️ **云端支持** - 支持自定义 API（OpenAI 兼容）
- 📏 **容量管理** - 自动警告，防止溢出
- ⚙️ **灵活配置** - 多模型可选，本地/云端切换
- 🔄 **定期审查** - 自动整理，保持精炼
- 🤝 **跨 Agent 共享** - 多智能体团队记忆层，Kairos 推理结果自动注入

---

## 📦 安装

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
```

---

## 🚀 快速开始

### 单 Agent 记忆

```bash
# 容量检查
node scripts/memory-capacity-check.js

# 关键词检索
node scripts/memory-tempr.js "用户偏好"

# 语义搜索
node scripts/memory-semantic.js 索引
node scripts/memory-semantic.js "你的查询"
```

### 团队记忆（跨 Agent 共享）

```bash
# 初始化共享目录
mkdir -p ~/.openclaw/agents/shared

# 写入共享记忆
node scripts/team/memory-team.js write observations "英超保级队主场强势"

# 查询团队记忆
node scripts/team/memory-team.js query "保级"

# 查看团队统计
node scripts/team/memory-team.js stats

# 查看历史记录
node scripts/team/memory-team.js history observations --limit=10

# 对比两天差异
node scripts/team/memory-team.js diff observations 2026-04-18 2026-04-19
```

---

## 🤝 跨 Agent 记忆共享

多个 Agent（main / analyst / intelligence / reviewer）共享同一个记忆层，Kairos 推理结果自动注入。

### 架构

```
main ──┐
analyst ──┼──→ 共享记忆层 (shared/) ◄── Kairos 推理结论
intelligence ──┤ mentalModels / worldFacts / observations / experiences
reviewer ────┘
```

### AgentContext API

```javascript
const { AgentContext } = require('./lib/multi-agent/index.js');

// 创建上下文（agentId 标识来源）
const ctx = new AgentContext('analyst');

// 写入共享记忆
await ctx.writeShared('mentalModels', '战意优先原则', {
  confidence: 0.95,
  tags: ['竞彩', '核心原则']
});

// 读取所有共享记忆
const all = await ctx.readAllShared();
// → { mentalModels: [...], worldFacts: [...], observations: [...], experiences: [...] }

// 按关键词查询
const results = await ctx.queryTeam('保级', ['mentalModels', 'observations']);

// 团队统计
const stats = await ctx.teamStats();
// → { totalEntries: 42, byLayer: {...}, byAgent: { analyst: 15, main: 27 } }
```

### Kairos 集成

Kairos 推理结果自动写入共享记忆层（见 `kairos-learner.py` 中的 `write_to_hindsight_memory()`）。

---

## 📚 5 层记忆架构

```
┌─────────────────────────────────────┐
│   💫 Ephemeral (短期工作记忆)       │  ← 会话级，内存缓存
├─────────────────────────────────────┤
│      🎭 Experiences (具体经历)      │  ← 事件、对话记录
├─────────────────────────────────────┤
│   👁️ Observations (观察到的模式)    │  ← 洞察、规律
├─────────────────────────────────────┤
│      🌍 World Facts (客观事实)      │  ← 知识、配置
├─────────────────────────────────────┤
│   🧠 Mental Models (精炼智慧)       │  ← 核心原则、最佳实践
└─────────────────────────────────────┘
```

### 共享层 vs 私有层

| 层级 | 共享策略 | 说明 |
|------|---------|------|
| mentalModels | ✅ 强制共享 | 核心原则，所有 Agent 可见 |
| worldFacts | ✅ 强制共享 | 客观事实，知识共建 |
| observations | 🔄 按需共享 | 洞察，可标记来源 |
| experiences | 🔄 按需共享 | 经历，可追溯 |
| ephemeral | ❌ 不共享 | 短期会话缓存 |

---

## 🔧 CLI 工具

### 团队记忆 CLI

```bash
# 读取某层记忆
node scripts/team/memory-team.js read observations

# 写入记忆
node scripts/team/memory-team.js write observations "新发现的内容"

# 搜索
node scripts/team/memory-team.js query "关键词"

# 统计
node scripts/team/memory-team.js stats

# 历史记录
node scripts/team/memory-team.js history observations --limit=10

# 差异对比
node scripts/team/memory-team.js diff observations 2026-04-18 2026-04-19
```

### 单 Agent CLI

```bash
node scripts/memory-capacity-check.js
node scripts/memory-tempr.js "查询"
node scripts/memory-semantic.js "查询"
```

---

## ☁️ 向量检索配置

```bash
# 启用本地向量
npm run semantic -- config enable-local

# 启用云端向量
export OPENAI_API_KEY=your-key
npm run semantic -- config enable-cloud your-key

# 自定义 API（支持国内大模型）
npm run semantic -- config set-url https://open.bigmodel.cn/api/paas/v4
```

---

## 📁 文件结构

```
hindsight-memory/
├── lib/
│   ├── memory-entry.js              # 数据模型
│   ├── memory-manager.js           # 主入口
│   ├── config.js                   # 配置管理
│   ├── multi-agent/                # 跨 Agent 共享模块 ⭐
│   │   ├── index.js                # 导出入口
│   │   └── agent-context.js        # AgentContext 核心类
│   ├── retrieval/                  # 检索模块
│   │   ├── keyword-search.js
│   │   └── semantic-search.js
│   └── storage/                    # 存储模块
├── scripts/
│   ├── memory-capacity-check.js
│   ├── memory-tempr.js
│   ├── memory-semantic.js
│   └── team/                       # 团队协作 CLI ⭐
│       └── memory-team.js
├── templates/
├── ARCHITECTURE.md
├── SKILL.md
├── README.md
└── package.json
```

---

## 🤝 接入新 Agent

在 Agent 的 `AGENTS.md` 末尾添加：

```markdown
## 团队共享记忆

启动时可通过 AgentContext 读取团队共享记忆：

const {AgentContext} = require('/path/to/hindsight-memory/lib/multi-agent/index.js');
const ctx = new AgentContext('your-agent-id');

const all = await ctx.readAllShared();
const results = await ctx.queryTeam('关键词', ['mentalModels', 'observations']);
```

---

## ⚙️ 配置

配置文件：`~/.openclaw/agents/main/memory-config.json`

```json
{
  "vector": {
    "enabled": false,
    "type": "local",
    "model": "Xenova/all-MiniLM-L6-v2",
    "dimensions": 384,
    "threshold": 0.7
  }
}
```

---

## 📝 更新日志

See [CHANGELOG.md](CHANGELOG.md)

---

## 📄 许可证

[MIT License](LICENSE)

---

_此项目由小爪（OpenClaw Agent）创建并维护_ 🐾
