# 🧠 Hindsight Memory System

> 基于 Hindsight 四层架构的 AI 智能体记忆系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-blue.svg)](https://openclaw.ai)

---

## ✨ 特性

- 🏗️ **四层架构** - Mental Models → Observations → World Facts → Experiences
- 💾 **持久化存储** - 文件级记忆，重启不丢失
- 🔍 **智能检索** - 多源记忆，语义搜索
- 📏 **容量管理** - 自动警告，防止溢出
- 🔄 **定期审查** - 自动整理，保持精炼

---

## 📦 安装

### 作为 OpenClaw Skill 安装

```bash
openclaw skills install https://github.com/simer11-jing/hindsight-memory
```

### 手动安装

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
cp -r templates/* ~/.openclaw/agents/main/
mkdir -p ~/.openclaw/agents/main/memory
```

---

## 🚀 快速开始

### 1. 初始化记忆文件

```bash
# 创建记忆目录
mkdir -p ~/.openclaw/agents/main/memory

# 复制模板
cp templates/MEMORY.md ~/.openclaw/agents/main/
```

### 2. 写入记忆

```
用户：记住我的邮箱是 example@email.com
助手：✅ 已记录到 MEMORY.md (World Facts)
```

### 3. 检索记忆

```
用户：我的邮箱是什么？
助手：根据 MEMORY.md 记录，你的邮箱是 example@email.com
```

### 4. 检查容量

```bash
node scripts/memory-capacity-check.js
```

---

## 📚 记忆架构

### 四层结构

```
┌─────────────────────────────────────┐
│     Mental Models (精炼智慧)         │  ← 最高优先级
│   常见问题的精炼答案                  │
├─────────────────────────────────────┤
│    Observations (观察到的模式)       │
│   从事实中提取的洞察                  │
├─────────────────────────────────────┤
│      World Facts (客观事实)          │
│   接收到的外部信息                    │
├─────────────────────────────────────┤
│      Experiences (我的经历)          │  ← 最低优先级
│   我的行为和互动                      │
└─────────────────────────────────────┘
```

### 检索优先级

**Mental Models → Observations → World Facts → Experiences**

---

## 📁 文件结构

```
~/.openclaw/agents/main/
├── MEMORY.md              # 长期记忆（≤200行/25KB）
├── memory/                # 每日日志
│   ├── 2026-04-06.md
│   └── reflections/       # 反思记录
├── AGENTS.md              # 工作空间规则
├── SOUL.md                # 身份定义
└── USER.md                # 用户信息
```

---

## 🔧 工具脚本

### memory-capacity-check.js

检查 MEMORY.md 容量。

```bash
node scripts/memory-capacity-check.js [FILE_PATH]
```

输出示例：
```
📊 MEMORY.md 统计
──────────────────────────────────────────────────
行数: 156 / 200 (78%)
大小: 18.5KB / 25KB (74%)
状态: ✅ 正常
```

---

## 📝 最佳实践

### ✅ 应该记录的

- ✅ 重要决策和原因
- ✅ 用户偏好和习惯
- ✅ 项目关键信息
- ✅ 学习到的教训
- ✅ 系统配置（脱敏）

### ❌ 不应该记录的

- ❌ 临时性信息
- ❌ 敏感数据（明文密码）
- ❌ 重复内容
- ❌ 无用细节

### 🔄 定期维护

- 每周审查 MEMORY.md
- 清理过时信息
- 整合重复内容
- 提升重要观察

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
```

### 测试

```bash
npm test
```

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 致谢

- [Hindsight](https://arxiv.org) - 四层记忆架构灵感
- [Claude Code](https://www.anthropic.com) - 多层记忆设计参考
- [OpenClaw](https://openclaw.ai) - AI 智能体平台

---

_此项目由小爪（OpenClaw Agent）创建并维护_ 🐾
