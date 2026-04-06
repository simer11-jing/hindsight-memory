# Hindsight Memory System

## 描述

基于 Hindsight 四层架构的 AI 智能体记忆系统，提供持久化记忆、自动提取、容量管理和定期审查功能。

---

## 🎯 适用场景

- AI 智能体需要长期记忆
- 需要记录重要决策、学习笔记
- 需要定期回顾和整理记忆
- 需要结构化的记忆管理

---

## 📚 记忆架构

### 四层记忆结构（Hindsight）

| 层级 | 类型 | 说明 | 示例 |
|------|------|------|------|
| **Mental Models** | 用户管理的摘要 | 常见问题的精炼答案 | "用户偏好简洁回复" |
| **Observations** | 自动整合的知识 | 从事实中提取的模式 | "用户喜欢尝试新工具" |
| **World Facts** | 客观世界事实 | 接收到的外部信息 | "Gateway 端口 28789" |
| **Experiences** | 代理自身经历 | 我的行为和互动 | "完成了系统升级" |

### 检索优先级

```
Mental Models → Observations → World Facts → Experiences
```

---

## 📁 文件结构

```
~/.openclaw/agents/main/
├── MEMORY.md              # 长期记忆（最多 200 行 / 25KB）
├── memory/                # 每日日志目录
│   ├── 2026-04-06.md      # 当日日志
│   ├── 2026-04-05.md      # 昨日日志
│   └── reflections/       # 反思记录
│       └── 2026-04-07.md
├── AGENTS.md              # 工作空间规则
├── SOUL.md                # 身份定义
└── USER.md                # 用户信息
```

---

## 🔧 功能特性

### 1. 自动记忆提取

- 自动从对话中提取重要信息
- 智能分类到四层架构
- 去重和精炼

### 2. 容量管理

- MEMORY.md 限制：200 行 / 25KB
- 自动警告和截断
- 定期清理过期内容

### 3. 记忆审查

- 每周自动审查建议
- 识别重复、过时、冲突
- 提升重要信息到 Mental Models

### 4. 多源记忆

- 文件级记忆（持久化）
- 向量数据库记忆（语义检索）
- LCM 无损压缩记忆

---

## 🚀 使用方法

### 初始化

```bash
# 创建记忆目录
mkdir -p ~/.openclaw/agents/main/memory

# 复制模板
cp templates/MEMORY.md ~/.openclaw/agents/main/
```

### 记忆写入

```
用户：记住我的邮箱是 example@email.com
助手：✅ 已记录到 MEMORY.md
```

### 记忆检索

```
用户：我的邮箱是什么？
助手：根据记忆，你的邮箱是 example@email.com
```

### 记忆审查

```bash
# 运行记忆审查
node scripts/memory-review.js
```

---

## 📏 容量检查

```bash
node scripts/memory-capacity-check.js ~/.openclaw/agents/main/MEMORY.md
```

输出示例：
```
📊 MEMORY.md 统计
- 行数: 156 / 200 (78%)
- 大小: 18.5KB / 25KB (74%)
- 状态: ✅ 正常
```

---

## 🔄 记忆生命周期

```
1. 对话发生
   ↓
2. 自动提取重要信息
   ↓
3. 写入每日日志 (memory/YYYY-MM-DD.md)
   ↓
4. 定期审查整理
   ↓
5. 提升到长期记忆 (MEMORY.md)
   ↓
6. 超出容量时清理过期内容
```

---

## ⚙️ 配置

### OpenClaw 配置

```json
{
  "plugins": {
    "entries": {
      "memory-lancedb-pro": {
        "enabled": true,
        "config": {
          "autoCapture": true,
          "autoRecall": true,
          "smartExtraction": true
        }
      }
    }
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
- 系统配置和密码（脱敏）

### ❌ 不应该记录的

- 临时性信息
- 敏感数据（明文密码）
- 重复内容
- 无用细节

### 🔄 定期维护

- 每周审查一次 MEMORY.md
- 清理过时信息
- 整合重复内容
- 提升重要观察

---

## 🛠️ 工具脚本

### memory-capacity-check.js

检查 MEMORY.md 容量是否超出限制。

```bash
node memory-capacity-check.js [FILE_PATH]
```

### memory-review.js

自动审查记忆，识别问题。

```bash
node memory-review.js
```

---

## 📖 参考资料

- [Hindsight:四层记忆架构](https://arxiv.org/abs/xxxx)
- [Claude Code: 多层记忆设计](https://docs.anthropic.com)
- [OpenClaw: 记忆系统文档](https://docs.openclaw.ai)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

_此 Skill 由小爪（OpenClaw Agent）创建并维护_
