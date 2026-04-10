# Hindsight-Memory 架构文档

## 版本：2.0.0

---

## 1. 架构概览

### 1.1 5 层记忆架构

| 层级 | 名称 | 说明 | 存储方式 |
|------|------|------|----------|
| L1 | **Ephemeral** | 短期工作记忆，当前会话上下文 | 内存/会话级 |
| L2 | **Experiences** | 具体经历、事件、对话 | 文件 + SQLite |
| L3 | **Observations** | 观察到的模式、规律 | 文件 + SQLite |
| L4 | **World Facts** | 客观事实、知识 | 文件 |
| L5 | **Mental Models** | 精炼智慧、核心信念 | 文件（Git版本控制） |

### 1.2 架构图

```
┌─────────────────────────────────────────────────────┐
│                    User Query                        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                Memory Manager                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Write     │  │   Search    │  │  Lifecycle  │ │
│  │   Layer     │  │   Layer     │  │   Manager   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│   File    │  │  SQLite   │  │  Vector   │
│   Store   │  │   Store   │  │   Store   │
│  (JSON)   │  │ (可选)    │  │ (可选)    │
└───────────┘  └───────────┘  └───────────┘
```

---

## 2. 数据模型

### 2.1 MemoryEntry

```typescript
interface MemoryEntry {
  id: string;                    // UUID
  layer: Layer;                  // 所属层级
  content: string;               // 记忆内容
  embedding?: number[];          // 向量嵌入（可选）
  metadata: MetaData;            // 元数据
  importance: number;            // 重要性 (0-1)
  createdAt: Date;               // 创建时间
  accessedAt: Date;              // 最后访问时间
  accessCount: number;           // 访问次数
}

type Layer = 'ephemeral' | 'experiences' | 'observations' | 'worldFacts' | 'mentalModels';

interface MetaData {
  source: string;                // 来源 (conversation/file/web)
  tags: string[];                // 标签
  entities: string[];            // 提及的实体
  sessionId?: string;            // 关联会话ID
  parentId?: string;             // 父记忆ID（用于关联）
}
```

### 2.2 文件格式

**MEMORY.md (L4-L5)**:
```markdown
# MEMORY.md - 长期记忆

---

## 🧠 Mental Models（精炼智慧）

- 团队沟通最佳实践
- 项目决策原则

---

## 🌍 World Facts（客观事实）

- 系统配置
- 用户信息

---

## 🎭 Experiences（我的经历）

（可选，用于短期）

---

## 👁️ Observations（观察到的模式）

（可选）

---
```

**memory/YYYY-MM-DD.md (L2-L3)**:
```markdown
# 2026-04-11 工作日志

## 👁️ Observations
- 用户偏好简洁回复

## 🎭 Experiences
- 完成了 TEMPR 检索开发
```

---

## 3. API 设计

### 3.1 MemoryManager

```typescript
class MemoryManager {
  // 写入
  async add(content: string, layer: Layer, options?: WriteOptions): Promise<MemoryEntry>
  async addEphemeral(content: string, sessionId: string): Promise<MemoryEntry>
  
  // 读取
  async get(id: string): Promise<MemoryEntry | null>
  async getByLayer(layer: Layer): Promise<MemoryEntry[]>
  
  // 检索
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]>
  async searchByLayer(layer: Layer, query: string): Promise<SearchResult[]>
  
  // 生命周期
  async consolidate(): Promise<void>        // 压缩/合并
  async archive(days: number): Promise<void> // 归档旧数据
  async forget(id: string): Promise<void>   // 删除
  
  // 管理
  async getStats(): Promise<MemoryStats>
  async export(format: 'json' | 'md'): Promise<string>
  async backup(): Promise<string>
}

interface WriteOptions {
  tags?: string[]
  entities?: string[]
  source?: string
  importance?: number
}

interface SearchOptions {
  layer?: Layer
  limit?: number
  useSemantic?: boolean  // 是否使用向量搜索
  temporal?: DateRange
}

interface MemoryStats {
  total: number
  byLayer: Record<Layer, number>
  sizeBytes: number
  lastModified: Date
}
```

### 3.2 存储接口

```typescript
interface StorageAdapter {
  // 写入
  async save(entry: MemoryEntry): Promise<void>
  
  // 读取
  async get(id: string): Promise<MemoryEntry | null>
  async getByLayer(layer: Layer): Promise<MemoryEntry[]>
  async getAll(): Promise<MemoryEntry[]>
  
  // 删除
  async delete(id: string): Promise<void>
  
  // 查询
  async query(filter: QueryFilter): Promise<MemoryEntry[]>
}

// 实现
class FileStorage implements StorageAdapter { /* ... */ }
class SQLiteStorage implements StorageAdapter { /* ... */ }
class VectorStorage implements StorageAdapter { /* 用于语义搜索 */ }
```

### 3.3 检索接口

```typescript
interface RetrievalAdapter {
  // 搜索
  async search(query: string, options: SearchOptions): Promise<SearchResult[]>
  
  // 索引
  async index(entries: MemoryEntry[]): Promise<void>
  async reindex(): Promise<void>
}

// 实现
class KeywordSearch implements RetrievalAdapter { /* grep/Boyer-Moore */ }
class SemanticSearch implements RetrievalAdapter { /* 向量相似度 */ }
class HybridSearch implements RetrievalAdapter { /* RRF 融合 */ }
```

---

## 4. 检索流程

### 4.1 混合检索

```
User Query
    │
    ▼
┌─────────────────┐
│  Query分析       │
│  - 提取关键词    │
│  - 生成向量      │
└─────────────────┘
    │
    ├──────────────────┐
    ▼                  ▼
┌─────────┐      ┌──────────┐
│关键词搜索│      │ 向量搜索 │
│ (BM25)  │      │ (cosine) │
└────┬────┘      └────┬─────┘
     │                │
     └───────┬────────┘
             ▼
    ┌─────────────────┐
    │  RRF 融合结果    │
    │  (Reciprocal    │
    │   Rank Fusion)  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   返回 Top-K    │
    └─────────────────┘
```

### 4.2 RRF 算法

```javascript
function rrfFusion(resultsList, k = 60) {
  const scores = {};
  
  for (const results of resultsList) {
    for (let i = 0; i < results.length; i++) {
      const id = results[i].id;
      const score = 1 / (k + i + 1);
      scores[id] = (scores[id] || 0) + score;
    }
  }
  
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ id, score }));
}
```

---

## 5. 生命周期管理

### 5.1 TTL 策略

| 层级 | TTL | 策略 |
|------|-----|------|
| Ephemeral | 会话结束 | 内存自动清除 |
| Experiences | 90天未访问 | 降级为 Observations |
| Observations | 180天未访问 | 压缩为 Mental Model |
| World Facts | 长期 | 归档不删除 |
| Mental Models | 永久 | Git 版本控制 |

### 5.2 自动压缩

```
当 Experiences 积累 > 100 条时:
  ↓
提取共同模式
  ↓
生成新 Observation
  ↓
标记原 Experiences 为"已压缩"
  ↓
保留引用关系
```

### 5.3 归档策略

```
数据 > 1 年未访问:
  ↓
打包为 JSONL
  ↓
移至 cold/ 目录
  ↓
更新索引（指向归档文件）
```

---

## 6. 配置

### 6.1 配置文件

```json
{
  "memory": {
    "maxLinesPerLayer": 200,
    "maxSizeKB": 25,
    "autoCompression": true,
    "compressionThreshold": 100
  },
  "storage": {
    "primary": "file",
    "enableSQLite": false,
    "enableVector": false
  },
  "vector": {
    "provider": "sqlite-vss",
    "model": "all-MiniLM-L6-v2",
    "dimensions": 384
  },
  "retrieval": {
    "defaultLimit": 10,
    "hybridRrfK": 60,
    "semanticThreshold": 0.7
  },
  "lifecycle": {
    "ephemeralTTL": "session",
    "experiencesTTL": 90,
    "archiveAfter": 365
  }
}
```

---

## 7. 向后兼容

### 7.1 V1 → V2 迁移

```bash
# 1. 备份
cp MEMORY.md MEMORY.md.v1.backup

# 2. 转换格式
node scripts/migrate-v1-to-v2.js

# 3. 验证
npm test
```

### 7.2 兼容模式

- 保持 MEMORY.md 格式不变
- 新增 metadata 通过 YAML front-matter
- 旧脚本继续可用

---

## 8. 性能优化

### 8.1 索引策略

| 数据类型 | 索引方式 |
|----------|----------|
| 文件内容 | 反向索引（行号→内容） |
| 层级 | 按文件区块 |
| 时间 | 文件名日期 |
| 向量 | HNSW 索引 |

### 8.2 缓存策略

- L1 (Ephemeral): 完全在内存
- L2-L3: LRU 缓存 最近 100 条
- L4-L5: 内存映射文件

---

## 9. 目录结构

```
hindsight-memory/
├── lib/
│   ├── memory-entry.js      # 数据模型
│   ├── memory-manager.js    # 主入口
│   ├── storage/
│   │   ├── file-store.js    # 文件存储
│   │   ├── sqlite-store.js  # SQLite 存储
│   │   └── hybrid-store.js  # 混合存储
│   ├── retrieval/
│   │   ├── keyword-search.js
│   │   ├── semantic-search.js
│   │   └── hybrid-search.js
│   └── lifecycle/
│       ├── ttl-manager.js
│       ├── compression.js
│       └── archival.js
├── scripts/
│   ├── memory-check.js
│   ├── memory-review.js
│   ├── memory-tempr.js      # TEMPR 检索
│   └── migrate-v1-to-v2.js  # 迁移脚本
├── config/
│   └── default.json
├── templates/
│   ├── MEMORY.md
│   └── MEMORY_PERSONAL.md
├── ARCHITECTURE.md
└── package.json
```

---

## 10. 使用示例

### 10.1 基本使用

```javascript
const { MemoryManager } = require('./lib/memory-manager');

const memory = new MemoryManager();

// 添加记忆
await memory.add(
  '用户偏好简洁回复，不喜欢冗长',
  'observations',
  { tags: ['偏好', '沟通'], importance: 0.8 }
);

// 搜索
const results = await memory.search('用户偏好');

// 按层搜索
const mental = await memory.searchByLayer('mentalModels', '原则');
```

### 10.2 命令行

```bash
# 检查容量
npm run check

# 检索
npm run tempr "用户"

# 压缩
npm run consolidate

# 备份
npm run backup

# 导出
npm run export-json
```

---

**文档版本**: 2.0.0  
**最后更新**: 2026-04-11