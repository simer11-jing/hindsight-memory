# 🧠 Hindsight Memory System

> 基于 **5 层架构 + MemOS 增强**的 AI 智能体记忆系统，支持本地/云端向量检索、**跨 Agent 记忆共享**、STM→LTM 自动压缩

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-blue.svg)](https://openclaw.ai)
[![Version](https://img.shields.io/badge/version-2.1.0-green.svg)](https://github.com/simer11-jing/hindsight-memory)

---

## ✨ 特性

### 核心能力
- 🏗️ **5 层架构** - Ephemeral → Experiences → Observations → World Facts → Mental Models
- 🔄 **STM→LTM 压缩** - 模拟 MemOS，自动将会话缓冲归档到长期记忆
- 🗺️ **KG-Lite 索引** - 实体关系三元组结构，快速检索核心事实
- 💾 **持久化存储** - 文件级记忆，重启不丢失
- 🔍 **智能检索** - 关键词 + 语义向量混合搜索

### 协作能力
- 🤝 **跨 Agent 共享** - 多智能体团队记忆层
- ☁️ **云端备份** - SMB/WebDAV 自动备份到 NAS
- 📏 **容量管理** - 自动警告，防止溢出
- ⚙️ **灵活配置** - 多模型可选，本地/云端切换

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    会话层 (STM)                         │
│         memory/stm-current.md — 实时缓冲              │
│         ↓ 每日 23:50 自动压缩                          │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   长期层 (LTM)                          │
│  memory/YYYY-MM-DD.md — 每日归档                       │
│  MEMORY.md 顶部 KG-Lite 索引 — 实体关系三元组           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   知识层 (KG-Lite)                      │
│  Entity → Relation → Entity 结构化事实                  │
│  例: [NAS] → IP → 192.168.50.20                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 安装

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
```

---

## 🚀 快速开始

### 1. 单 Agent 记忆

```bash
# 容量检查
node scripts/memory-capacity-check.js

# 关键词检索
node scripts/memory-tempr.js "用户偏好"

# 语义搜索
node scripts/memory-semantic.js "你的查询"
```

### 2. STM→LTM 自动压缩（MemOS 增强）

```bash
# 每日 23:50 自动执行（加入 cron）
50 23 * * * bash scripts/stm-ltm-compress.sh

# 手动触发
bash scripts/stm-ltm-compress.sh
```

### 3. SMB 自动备份

```bash
# 编辑备份目标（默认配置）
# 目标: //192.168.50.20/智能体记忆/总控爪
# 频率: 每日 23:55

# 手动执行备份
bash scripts/backup-memory-smb.sh

# 加入 cron
55 23 * * * bash scripts/backup-memory-smb.sh
```

---

## 🤝 团队记忆（跨 Agent 共享）

### 架构

```
~/.openclaw/agents/
├── shared/                    # 团队共享记忆（所有 Agent 可见）
│   ├── mentalModels.md
│   ├── worldFacts.md
│   ├── observations.md
│   └── experiences.md
├── main/                      # Agent A
│   ├── MEMORY.md              # 私有 + KG-Lite 索引
│   └── memory/
│       ├── stm-current.md     # STM 缓冲
│       └── YYYY-MM-DD.md     # LTM 归档
├── analyst/                   # Agent B
└── intelligence/              # Agent C
```

### CLI 用法

```bash
# 团队统计
node scripts/team/memory-team.js stats

# 写入团队记忆
node scripts/team/memory-team.js write observations "英超保级队主场强势"

# 查询团队记忆
node scripts/team/memory-team.js query "保级"

# 对比两天差异
node scripts/team/memory-team.js diff observations 2026-04-18 2026-04-19
```

---

## 🗺️ KG-Lite 索引

MEMORY.md 顶部包含实体关系三元组索引：

```markdown
## 🗺️ Memory Index (KG-Lite)

- [Entity] -> [Relation] -> [Value/Entity]
- [NAS] -> IP -> 192.168.50.20
- [竞彩爪] -> 位置 -> 192.168.50.2
- [专家克劳德] -> 类型 -> ACP Agent
```

检索时优先查索引，命中后直接返回，避免全文搜索。

---

## 📁 文件结构

```
hindsight-memory/
├── ARCHITECTURE.md           # 详细架构文档
├── CHANGELOG.md              # 版本变更
├── CONTRIBUTING.md            # 贡献指南
├── README.md                  # 本文档
├── README_EN.md               # English version
├── SKILL.md                   # OpenClaw Skill 定义
├── scripts/
│   ├── backup-memory-smb.sh   # SMB 备份脚本
│   ├── stm-ltm-compress.sh    # STM→LTM 压缩脚本
│   ├── memory-*.js            # 各类记忆操作脚本
│   └── team/                  # 跨 Agent 共享
├── lib/
│   ├── index.js               # 核心导出
│   ├── memory-manager.js       # 记忆管理器
│   ├── memory-entry.js        # 记忆条目
│   ├── storage/               # 存储层
│   │   ├── file-store.js      # 文件存储
│   │   ├── sqlite-store.js    # SQLite 存储
│   │   └── hybrid-store.js    # 混合存储
│   ├── retrieval/             # 检索层
│   │   ├── keyword-search.js   # 关键词搜索
│   │   ├── semantic-search.js  # 语义搜索
│   │   └── hybrid-search.js   # 混合搜索
│   └── multi-agent/           # 跨 Agent 支持
│       └── agent-context.js   # Agent 上下文
└── templates/
    └── stm/                   # STM 缓冲模板
```

---

## 🔧 OpenClaw Skill 集成

将此仓库安装为 OpenClaw Skill：

```bash
openclaw skills install hindsight-memory
```

---

## 📜 许可证

MIT License - see [LICENSE](LICENSE)
