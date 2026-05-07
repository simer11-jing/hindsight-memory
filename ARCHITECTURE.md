# Hindsight-Memory 架构文档

## 版本：2.1.0

---

## 1. 架构概览

### 1.1 混合架构：Hindsight + MemOS

Hindsight-Memory 结合了 Hindsight 的五层记忆架构和 MemOS 的分层压缩机制：

```
┌─────────────────────────────────────────────────────────────┐
│                   Hindsight 5 层架构                       │
├─────────────────────────────────────────────────────────────┤
│  L1 Ephemeral     │ 短期工作记忆，会话级                    │
│  L2 Experiences    │ 具体经历、事件、对话                    │
│  L3 Observations   │ 观察到的模式、规律                      │
│  L4 World Facts    │ 客观事实、知识                          │
│  L5 Mental Models  │ 精炼智慧、核心信念                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   MemOS 分层增强                            │
├─────────────────────────────────────────────────────────────┤
│  STM (短期) → LTM (长期) → KG (知识图谱)                    │
│  实时缓冲     每日归档     实体关系三元组                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 数据流

```
用户对话
    ↓
STM Buffer (memory/stm-current.md)
    ↓ 每日 23:50 压缩
LTM Archive (memory/YYYY-MM-DD.md)
    ↓ KG 提取
KG-Lite Index (MEMORY.md 顶部)
    ↓
语义/向量检索 ←→ 混合检索引擎
    ↓
记忆召回 → 回复 → 用户
```

---

## 2. 核心组件

### 2.1 Memory Manager

```javascript
const { MemoryManager } = require('./lib/memory-manager');

const mm = new MemoryManager({
  basePath: '~/.openclaw/agents/main',
  storage: 'hybrid',  // file | sqlite | hybrid
});
```

**职责**：
- 写入记忆（自动打标、分层）
- 检索记忆（关键词+语义混合）
- 生命周期管理（压缩、归档、删除）

### 2.2 STM Buffer

| 字段 | 说明 |
|------|------|
| 文件 | `memory/stm-current.md` |
| 刷新 | 每会话开始时重置时间戳 |
| 压缩 | 每日 23:50 自动执行 `stm-ltm-compress.sh` |

**STM 内容格式**：
```markdown
# STM - 当前会话缓冲

## 📋 本次会话记录
### 会话信息
- **会话开始**: 2026-05-07 17:00 CST
### 关键决策
<!-- 记录本次重要决策 -->
### 用户偏好/变化
<!-- 记录新偏好 -->
### 待归档到 LTM 的事实
<!-- 需要持久化的信息 -->
```

### 2.3 LTM Archive

| 字段 | 说明 |
|------|------|
| 文件 | `memory/YYYY-MM-DD.md` |
| 来源 | STM 压缩 + 手动写入 |
| 保留 | 无上限，按日期归档 |

### 2.4 KG-Lite Index

**位置**：MEMORY.md 顶部

**格式**：
```markdown
## 🗺️ Memory Index (KG-Lite)

> 结构: [实体] -> [关系] -> [值/实体]

- [NAS] -> IP -> 192.168.50.20
- [竞彩爪] -> 位置 -> 192.168.50.2
- [竞彩爪] -> SSH端口 -> 33
```

**检索优先级**：
1. 查 KG-Lite 索引（毫秒级）
2. 命中 → 直接返回
3. 未命中 → 全文语义搜索

---

## 3. 存储层

### 3.1 File Store（默认）

```javascript
const store = new FileStore({
  basePath: '~/.openclaw/agents/main',
  format: 'json',  // json | markdown
});
```

### 3.2 SQLite Store（可选）

```javascript
const store = new SQLiteStore({
  path: '~/.openclaw/agents/main/.memory/memory.db',
});
```

### 3.3 Hybrid Store（推荐）

自动选择：
- 写入 → File Store
- 检索 → SQLite 向量索引

---

## 4. 检索层

### 4.1 混合检索策略

```javascript
const { HybridSearch } = require('./lib/retrieval/hybrid-search');

const search = new HybridSearch({
  vectorIndex: 'path/to/vector.db',
  keywordIndex: 'path/to/keyword.db',
});

const results = await search.query({
  text: '用户偏好什么模型',
  layers: ['observations', 'mentalModels'],
  topK: 5,
  keywordBoost: 0.3,
  semanticBoost: 0.7,
});
```

### 4.2 检索流程

```
1. 解析查询 → 关键词 + 语义向量
2. KG-Lite 快速匹配
3. 未命中 → 向量相似度搜索
4. 未命中 → 关键词倒排索引
5. 合并、去重、排序
6. 返回 Top-K 结果
```

---

## 5. 跨 Agent 共享

### 5.1 共享架构

```
~/.openclaw/agents/
├── shared/              # 共享记忆池
│   ├── mentalModels.md   # 强制共享
│   ├── worldFacts.md     # 强制共享
│   ├── observations.md   # 按需共享
│   └── experiences.md    # 按需共享
├── main/                 # 主 Agent
│   ├── MEMORY.md
│   └── memory/
│       ├── stm-current.md
│       └── YYYY-MM-DD.md
└── [other agents]/      # 其他 Agent
```

### 5.2 层级共享策略

| 层级 | 共享策略 | 说明 |
|------|---------|------|
| Mental Models | 强制共享 | 核心原则，最佳实践 |
| World Facts | 强制共享 | 系统配置，用户信息 |
| Observations | 按需共享 | 模式洞察，可贡献 |
| Experiences | 按需共享 | 个人经历，选择性 |
| Ephemeral | 不共享 | 会话级，无需共享 |

### 5.3 Agent Context

```javascript
const { AgentContext } = require('./lib/multi-agent');

const ctx = new AgentContext('main');

// 写入共享记忆
await ctx.writeShared('observations', '英超保级队主场强势', {
  tags: ['竞彩', '经验']
});

// 查询团队记忆
const results = await ctx.queryTeam('保级队分析');

// 团队统计
const stats = await ctx.teamStats();
```

---

## 6. SMB 备份

### 6.1 配置

```bash
# 环境变量（可选，覆盖默认）
export SMB_SERVER="192.168.50.20"
export SMB_SHARE="智能体记忆"
export SMB_USER="jinghao"
export SMB_PASS="Jing1234@"
export SMB_REMOTE_PATH="总控爪"
```

### 6.2 备份内容

- `MEMORY.md` — 主记忆文件
- `memory/*.md` — 所有记忆归档
- `manifest.json` — 备份元数据

### 6.3 定时任务

```bash
# 每日 23:55 执行
55 23 * * * bash /path/to/backup-memory-smb.sh
```

---

## 7. STM→LTM 压缩流程

### 7.1 压缩脚本

```bash
bash scripts/stm-ltm-compress.sh
```

### 7.2 执行流程

```
1. 检查 STM 是否有内容（<200字节跳过）
2. 提取三部分内容：
   - 关键决策
   - 用户偏好变化
   - 新增事实
3. 写入当日归档 memory/YYYY-MM-DD.md
4. 提取 KG 三元组，更新 MEMORY.md 索引
5. 清空 STM Buffer（保留模板）
```

---

## 8. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 2.1.0 | 2026-05-07 | 新增 MemOS 增强：STM/LTM/KG 分层 |
| 2.0.0 | 2026-04-24 | 5 层架构，混合检索 |
| 1.0.0 | 2026-04-11 | 初版发布 |
