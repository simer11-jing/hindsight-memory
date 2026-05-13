# Hindsight-Memory

一个面向 AI Agent 的轻量级记忆系统，提供 **短期记忆管理**、**长期归档**、**全文检索**、**健康检查** 与 **自动整理** 能力。

它适合用作：
- 独立的本地记忆库
- Agent 框架中的记忆模块
- 多脚本协作场景下的记忆整理工具

---

## 特性

- **五层记忆结构**：从短期缓冲到长期知识逐层沉淀
- **STM → LTM 转换**：支持把会话记忆自动归档为长期记录
- **统一检索入口**：支持关键词、全文索引与降级检索路由
- **自动去重与校验**：减少噪音、重复与低质量记忆条目
- **健康检查**：快速发现索引、容量、更新频率等问题
- **可脚本化集成**：适合接入定时任务、自动化流程与 Agent 系统

---

## 适用场景

Hindsight-Memory 适合以下类型的系统：

- 需要保留会话上下文的 AI 助手
- 需要将“临时记录”沉淀为“长期知识”的自动化系统
- 需要全文检索与结构化归档的个人知识工具
- 需要多阶段记忆管理的 Agent / Workflow 项目

---

## 快速开始

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
```

### 常用命令

```bash
# 统一检索
node scripts/memory-query-router.js "搜索关键词" 10

# 健康检查
bash scripts/memory-healthcheck.sh

# 重建全文索引
python3 scripts/build-fts-index.py
```

---

## 核心能力

### 1. 统一检索路由
`scripts/memory-query-router.js`

统一处理多种检索策略，优先走可用且高效的路径，在必要时自动降级。

### 2. 语义检索降级
`scripts/memory-semantic-fallback.js`

当语义检索不可用时，自动回退到更稳定的关键词或全文检索方案，避免功能中断。

### 3. 记忆去重与校验
`scripts/memory-dedup.js`

用于清理重复条目、过滤噪音、保持记忆文件质量。

### 4. 健康检查
`scripts/memory-healthcheck.sh`

用于检查：
- 记忆文件容量
- 索引是否存在
- 近期是否更新
- 关键流程是否正常运行

### 5. 全文索引构建
`scripts/build-fts-index.py`

基于 SQLite FTS5 构建全文索引，适合本地快速查询与 nightly 重建。

### 6. 会话归档与流程沉淀
- `scripts/session-archive.js`
- `scripts/generate-sop.js`

支持把任务过程沉淀为可复用的长期记录或标准操作流程。

---

## 目录结构

```text
hindsight-memory/
├── README.md
├── ARCHITECTURE.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SKILL.md
├── scripts/
│   ├── memory-query-router.js
│   ├── memory-semantic-fallback.js
│   ├── memory-dedup.js
│   ├── memory-healthcheck.sh
│   ├── build-fts-index.py
│   ├── session-archive.js
│   ├── generate-sop.js
│   └── sync-from-hindsight.sh
├── lib/
│   ├── memory-manager.js
│   ├── memory-entry.js
│   ├── storage/
│   ├── retrieval/
│   └── lifecycle/
└── templates/
```

---

## 推荐工作流

一个典型流程如下：

1. 将对话或任务记录写入短期记忆
2. 通过整理脚本进行清洗、去重和归档
3. 定时重建全文索引
4. 通过统一检索入口查询历史信息
5. 定期运行健康检查，确保系统稳定

---

## 常见问题

### 语义搜索不可用怎么办？
系统会自动降级到其他可用检索路径，不会因为单点故障完全失效。

### 索引为什么需要重建？
当记忆文件新增或调整后，重建索引可以保证搜索结果及时更新。

### 数据库被锁怎么办？
先确认是否存在正在运行的索引任务；必要时结束残留进程后再重试。

---

## 贡献

欢迎提交 Issue 或 Pull Request 来改进：
- 检索质量
- 归档策略
- 文档结构
- 模板与脚本可维护性

详见 `CONTRIBUTING.md`。

---

## License

MIT License
