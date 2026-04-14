# Hindsight Memory System

> 基于 5 层架构的 AI 智能体记忆系统，支持本地/云端向量检索

---

## 🎯 适用场景

- AI 智能体需要长期记忆
- 需要语义向量搜索
- 需要多源记忆检索
- 需要本地/云端 embedding 模型

---

## 📚 记忆架构

### 五层记忆结构

| 层级 | 类型 | 说明 | 示例 |
|------|------|------|------|
| **Ephemeral** | 短期工作记忆 | 会话级缓存 | 当前任务状态 |
| **Experiences** | 代理自身经历 | 我的行为和互动 | "完成了系统升级" |
| **Observations** | 自动整合的知识 | 从事实中提取的模式 | "用户喜欢尝试新工具" |
| **World Facts** | 客观世界事实 | 接收到的外部信息 | "Gateway 端口 28789" |
| **Mental Models** | 用户管理的摘要 | 常见问题的精炼答案 | "用户偏好简洁回复" |

### 检索优先级

```
Mental Models → Observations → World Facts → Experiences → Ephemeral
```

---

## ✨ 特性

- 🏗️ **5 层架构** - Ephemeral 到 Mental Models
- 🔍 **向量搜索** - 本地/云端 embedding 模型
- ☁️ **云端支持** - 硅基流动、OpenAI、自定义 API
- 💾 **持久化** - 文件级记忆，重启不丢失
- 📏 **容量管理** - 自动警告，防止溢出

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

## 🚀 使用方法

### 初始化

```bash
mkdir -p ~/.openclaw/agents/main/memory
cp templates/MEMORY.md ~/.openclaw/agents/main/
```

### 向量搜索

```bash
# 配置硅基流动
export SILICONFLOW_API_KEY=your-key
node scripts/memory-semantic.js 配置 enable-siliconflow

# 建立索引
node scripts/memory-semantic.js 索引

# 语义搜索
node scripts/memory-semantic.js "你的查询"
```

### 关键词检索

```bash
node scripts/memory-tempr.js "查询"
```

### 容量检查

```bash
node scripts/memory-capacity-check.js
```

---

## ☁️ 云端模型配置

### 硅基流动（推荐）

```bash
export SILICONFLOW_API_KEY=your-key
node scripts/memory-semantic.js 配置 enable-siliconflow
```

### OpenAI

```bash
export OPENAI_API_KEY=your-key
node scripts/memory-semantic.js 配置 enable-cloud
```

### 自定义 API

```bash
node scripts/memory-semantic.js 配置 set-url https://your-api.com/v1
node scripts/memory-semantic.js 配置 set-key your-key
```

---

## 📏 配置详解

```json
{
  "vector": {
    "enabled": true,
    "type": "cloud",
    "cloudProvider": "siliconflow",
    "cloudBaseURL": "https://api.siliconflow.cn/v1",
    "cloudModel": "Qwen/Qwen3-Embedding-8B",
    "dimensions": 4096,
    "threshold": 0.7
  }
}
```

---

## 📝 最佳实践

### ✅ 应该记录的

- 重要决策和原因
- 用户偏好和习惯
- 项目关键信息
- 学习到的教训

### ❌ 不应该记录的

- 临时性信息
- 敏感数据（明文密码）
- 重复内容

---

## 🛠️ 工具脚本

| 脚本 | 用途 |
|------|------|
| `memory-capacity-check.js` | 容量检查 |
| `memory-tempr.js` | 关键词检索 |
| `memory-semantic.js` | 向量语义搜索 |
| `memory-consolidate.js` | 自动规整（超限压缩到SQLite） |
| `memory-archive.js` | 日志归档（90天+自动清理） |

---

## 📖 参考资料

- [Hindsight Memory](https://github.com/simer11-jing/hindsight-memory)
- [Transformers.js](https://xenova.github.io/transformers.js)
- [硅基流动 API](https://docs.siliconflow.cn)

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

---

## 📄 许可证

MIT License

---

_此 Skill 由小爪（OpenClaw Agent）创建并维护_ 🐾