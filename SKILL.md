# Hindsight Memory System

> 基于 5 层架构的 AI 智能体记忆系统，支持本地/云端向量检索

---

## 🤝 跨 Agent 记忆共享（v2.1 新增）

> 多 Agent 协作场景下，团队共享记忆层，所有 Agent 都能读取和贡献

### 架构

```
~/.openclaw/agents/
├── shared/                    # 团队共享记忆（所有 Agent 可见）
│   ├── mentalModels.md
│   ├── worldFacts.md
│   ├── observations.md
│   ├── experiences.md
│   └── .index.json
├── main/                      # Agent A
│   ├── MEMORY.md
│   └── memory/
│       ├── mentalModels.md    # 私有（仅 main 可见）
│       └── ...
├── analyst/                   # Agent B
│   ├── MEMORY.md
│   └── memory/
└── intelligence/              # Agent C
    └── ...

共享层：mentalModels / worldFacts（高价值、长期不变）
私有层：observations / experiences（个人经验、短期观察）
```

### CLI 用法

```bash
# 团队统计
node memory-team.js stats

# 读取共享记忆
node memory-team.js read --layer mentalModels

# 写入共享记忆（analyst Agent 贡献）
OPENCLAW_AGENT_ID=analyst node memory-team.js write "英超保级队主场强势" --layer observations --tags 竞彩

# 查询团队记忆
node memory-team.js query "用户偏好什么模型"

# 列出所有 Agent
node memory-team.js agents
```

### 核心类

```javascript
const { AgentContext } = require('./lib/multi-agent');

// 当前 Agent
const ctx = new AgentContext('main');
await ctx.writeShared('observations', '发现赔率临场暴升 > 0.3 需警惕', { tags: ['竞彩'] });
const results = await ctx.queryTeam('竞彩分析经验');

// 团队统计
const stats = await ctx.teamStats();
// { agents: ['main', 'analyst'], totalContributions: 42, layers: {...} }
```

### 层级共享策略

| 层级 | 共享策略 | 说明 |
|------|---------|------|
| mentalModels | 强制共享 | 核心原则、最佳实践 |
| worldFacts | 强制共享 | 系统配置、用户信息 |
| observations | 按需共享 | 模式洞察，可贡献给团队 |
| experiences | 按需共享 | 个人经历，选择性共享 |
| ephemeral | 不共享 | 会话级缓存，无需共享 |

### 与 Kairos 集成

```javascript
// Kairos 生成画像 -> 写入团队共享层
const kairosCtx = new AgentContext('main');
const profile = await kairosCtx.queryTeam('用户偏好');
// -> 团队成员都能查询到 main Agent 贡献的用户画像
```
