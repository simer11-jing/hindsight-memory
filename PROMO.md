# Hindsight-Memory：让 AI Agent 拥有真正的长期记忆 🧠

> 一个轻量、可脚本化的五层记忆系统，MIT 开源

---

## 🤔 AI Agent 最大的痛点是什么？

答完就忘。重启就丢。多轮对话越长，上下文越乱。

Hindsight-Memory 就是为解决这个问题而生——它不是一个大而全的框架，而是一套**小巧、务实、可嵌入**的记忆管理工具集。

---

## ✨ 它能做什么？

🔹 **会话记忆 → 长期沉淀**
每晚自动把短期记忆整理归档，不让有用信息随会话消失

🔹 **统一检索**
关键词、全文索引、语义检索三条路径自动路由，一条命令搜遍所有记忆

🔹 **自动去重**
定期清理噪音、重复条目，保持记忆库干净

🔹 **健康自检**
容量、索引、更新时间一眼看穿，出问题早知道

🔹 **流程沉淀**
从反复执行的任务中自动提取 SOP，越用越聪明

---

## 🚀 5 分钟上手

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
```

```bash
# 搜一下之前讨论过什么
node scripts/memory-query-router.js "用户偏好" 10

# 检查记忆系统是否健康
bash scripts/memory-healthcheck.sh

# 重建全文索引
python3 scripts/build-fts-index.py
```

---

## 🧩 不是又一个记忆框架

与 LangChain Memory / MemGPT / Letta 等方案不同：
- 不绑定特定 Agent 框架
- 不依赖向量数据库
- 纯文件 + SQLite，可直接集成到任何 Node.js/Python 项目
- 所有操作可脚本化，适合 cron 定时任务

---

## 🏗️ 五层记忆结构

```
短期工作记忆 → 具体经历 → 观察规律 → 世界知识 → 核心信念
     ↑                                          ↑
  当日归档                                   长期精炼
```

每层有独立的存储和检索策略，避免"大杂烩式 memory"的混乱。

---

## 📦 仓库地址

🔗 https://github.com/simer11-jing/hindsight-memory

MIT License · 欢迎 Star ⭐ · 欢迎 PR

---

## 🎯 适合谁？

- 正在搭建 AI Agent 的开发者
- 想让本地助手记住上下文的极客
- 需要轻量级知识管理工具的个人
- 对记忆系统架构感兴趣的研究者

---

*Build agents that remember. Not just respond.*
