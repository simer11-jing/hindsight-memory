# 🧠 Hindsight Memory System

> 基于 5 层架构的 AI 智能体记忆系统，支持本地/云端向量检索

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-blue.svg)](https://openclaw.ai)
[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](https://github.com/simer11-jing/hindsight-memory)

---

## ✨ 特性

- 🏗️ **5 层架构** - Ephemeral → Experiences → Observations → World Facts → Mental Models
- 💾 **持久化存储** - 文件级记忆，重启不丢失
- 🔍 **智能检索** - 关键词 + 语义向量混合搜索
- ☁️ **云端支持** - 支持自定义 API（OpenAI 兼容）
- 📏 **容量管理** - 自动警告，防止溢出
- ⚙️ **灵活配置** - 多模型可选，本地/云端切换
- 🔄 **定期审查** - 自动整理，保持精炼

---

## 📦 安装

### 一键安装（推荐）

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
chmod +x setup.sh
./setup.sh
```

### 手动安装

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
cp -r templates/* ~/.openclaw/agents/main/
mkdir -p ~/.openclaw/agents/main/memory
```

---

## 🚀 快速开始

### 1. 初始化

```bash
mkdir -p ~/.openclaw/agents/main/memory
cp templates/MEMORY.md ~/.openclaw/agents/main/
```

### 2. 基本使用

```bash
# 容量检查
npm run check

# 关键词检索
npm run tempr "用户偏好"

# 语义搜索（需要先建立索引）
npm run semantic 索引
npm run semantic "你的查询"
```

### 3. 配置向量检索

```bash
# 查看当前配置
npm run semantic

# 启用本地向量检索
npm run semantic -- config enable-local

# 启用云端向量检索
export OPENAI_API_KEY=your-key
npm run semantic -- config enable-cloud your-key

# 设置自定义 API（支持国内大模型）
npm run semantic -- config set-url https://open.bigmodel.cn/api/paas/v4
npm run semantic -- config set-key your-key
```

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

### 检索优先级

**Mental Models → Observations → World Facts → Experiences → Ephemeral**

---

## 🔧 工具脚本

### 容量检查

```bash
npm run check
# 或
node scripts/memory-capacity-check.js
```

### TEMPR 检索（关键词 + 多维）

```bash
npm run tempr "查询内容"
npm run tempr "配置" --layer mentalModels
npm run tempr "2026" --temporal
```

### 语义向量搜索

```bash
# 查看配置
npm run semantic

# 首次建立索引
npm run semantic 索引

# 语义搜索
npm run semantic "查询内容"
npm run semantic "查询" --layer worldFacts --threshold 0.8
```

### 配置管理

```bash
# 列出可用模型
npm run semantic -- config models

# 切换模型
npm run semantic -- config set-model Xenova/bge-small-zh-v1.5

# 启用/禁用
npm run semantic -- config disable
```

---

## ☁️ 云端向量模型

### 支持的模型

| 模型 | 维度 | 提供商 |
|------|------|--------|
| text-embedding-3-small | 1536 | OpenAI |
| text-embedding-3-large | 3072 | OpenAI |
| text-embedding-ada-002 | 1536 | OpenAI |

### 自定义 API（支持国内大模型）

```bash
# 智谱 GLM
npm run semantic -- config set-url https://open.bigmodel.cn/api/paas/v4
npm run semantic -- config set-key your-glm-key

# 阿里 DashScope
npm run semantic -- config set-url https://dashscope.aliyuncs.com/api/v1
npm run semantic -- config set-key your-dashscope-key

# OpenAI 兼容接口
npm run semantic -- config set-url https://your-api.com/v1
npm run semantic -- config set-key your-key
```

---

## 📁 文件结构

```
~/.openclaw/agents/main/
├── MEMORY.md                    # 长期记忆（≤200行/25KB）
├── memory/                      # 每日日志
│   ├── 2026-04-06.md
│   └── reflections/             # 反思记录
├── .memory-index.json           # 向量索引
├── memory-config.json           # 配置文件
├── AGENTS.md                    # 工作空间规则
├── SOUL.md                      # 身份定义
└── USER.md                      # 用户信息
```

---

## 📦 项目结构

```
hindsight-memory/
├── lib/                         # 核心库
│   ├── memory-entry.js          # 数据模型
│   ├── memory-manager.js        # 主入口
│   ├── config.js                # 配置管理
│   ├── retrieval/               # 检索模块
│   │   ├── keyword-search.js    # 关键词搜索
│   │   └── semantic-search.js   # 向量搜索
│   └── storage/                 # 存储模块
├── scripts/                     # 命令行工具
│   ├── memory-capacity-check.js
│   ├── memory-tempr.js
│   └── memory-semantic.js
├── templates/                   # 模板
├── ARCHITECTURE.md              # 架构文档
├── SKILL.md                     # OpenClaw 技能
└── README.md
```

---

## ⚙️ 配置详解

### 配置文件位置

`~/.openclaw/agents/main/memory-config.json`

### 配置项说明

```json
{
  "vector": {
    "enabled": false,
    "type": "local",          // "local" 或 "cloud"
    "model": "Xenova/all-MiniLM-L6-v2",
    "dimensions": 384,
    "device": "cpu",
    "threshold": 0.7,
    "cloudBaseURL": "",       // 自定义 API 地址
    "cloudApiKey": "",        // API Key
    "cloudModel": ""          // 云端模型名
  }
}
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
npm test
```

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 致谢

- [Hindsight](https://arxiv.org) - 多层记忆架构灵感
- [Claude Code](https://www.anthropic.com) - 多层记忆设计参考
- [OpenClaw](https://openclaw.ai) - AI 智能体平台
- [Transformers.js](https://xenova.github.io/transformers.js) - 本地向量模型

---

## 📝 更新日志

See [CHANGELOG.md](CHANGELOG.md)

---

_此项目由小爪（OpenClaw Agent）创建并维护_ 🐾