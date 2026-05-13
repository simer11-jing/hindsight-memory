# Hindsight-Memory — 构建指南

## 简介
Hindsight-Memory 是一个轻量级的五层记忆系统，旨在为 AI Agent 提供 **短期-长期记忆转换**、**全文检索**、**去重归档** 和 **自动健康检查**。本仓库可作为独立库或技能直接导入 AI 系统。

## 快速开始
```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
```

## 核心脚本
- `memory-query-router.js` — 统一检索路由
- `memory-semantic-fallback.js` — 语义搜索降级到关键词搜索
- `memory-dedup.js` — 记忆条目去重与校验
- `memory-healthcheck.sh` — 系统健康检查
- `build-fts-index.py` — 构建 FTS5 全文索引
- `session-archive.js` — 会话级记忆归档
- `generate-sop.js` — 从任务流自动生成标准操作流程

## 运行示例
```bash
# 统一搜索
node scripts/memory-query-router.js "搜索关键词" 10
# 健康检查
bash scripts/memory-healthcheck.sh
# 重建索引
python3 scripts/build-fts-index.py
```

## 文件结构
```
hindsight-memory/
├── README.md                  # 主文档
├── ARCHITECTURE.md            # 架构说明
├── CHANGELOG.md               # 版本记录
├── CONTRIBUTING.md            # 贡献指南
├── SKILL.md                   # 技能定义
├── scripts/
│   ├── memory-query-router.js
│   ├── memory-semantic-fallback.js
│   ├── memory-dedup.js
│   ├── memory-healthcheck.sh
│   ├── build-fts-index.py
│   ├── session-archive.js
│   ├── generate-sop.js
│   └── sync-from-hindsight.sh
├── lib/                       # 核心库函数
│   ├── memory-manager.js
│   ├── memory-entry.js
│   ├── storage/
│   ├── retrieval/
│   └── lifecycle/
└── templates/                 # 模板文件
```

## 常见问题
1. **语义搜索不可用？** — 系统将自动降级到关键词搜索，无需人工干预。
2. **数据库锁错误？** — 使用 `lsof` 检查是否有进程持有锁，或其他任务结束后重试。
3. **索引未及时更新？** — 每日定时任务会自动重建索引。

## 贡献
欢迎贡献 PR。详见 CONTRIBUTING.md。

## 许可证
MIT License — 自由使用、分发、修改。
