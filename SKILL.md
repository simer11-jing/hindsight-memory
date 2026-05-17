# Hindsight Memory System — OpenClaw Skill

> 基于 5 层架构 + MemOS 增强的 AI 智能体记忆系统

---

## 🤖 Skill 元信息

| 字段 | 值 |
|------|-----|
| **名称** | hindsight-memory |
| **版本** | 2.1.0 |
| **作者** | simer11-jing |
| **描述** | 5 层架构 + MemOS 增强，跨 Agent 记忆共享 |
| **触发词** | 记忆、记住、查询、搜索、recall |

---

## 📋 核心功能

### 1. 记忆写入
当用户说"记住 XXX"、"这个很重要"时：
- 写入 `memory/stm-current.md`
- 每日 23:50 自动压缩到 LTM

### 2. 记忆检索
当用户说"之前记得什么"、"查询记忆"时：
- 优先查 KG-Lite 索引
- 未命中 → 语义/关键词搜索

### 3. 跨 Agent 共享
团队成员共享 mentalModels/worldFacts 层

---

## 📁 关键文件

| 文件 | 用途 |
|------|------|
| `MEMORY.md` | 主记忆文件（含 KG-Lite 索引） |
| `memory/stm-current.md` | STM 实时缓冲 |
| `memory/YYYY-MM-DD.md` | LTM 每日归档 |
| `scripts/stm-ltm-compress.sh` | STM→LTM 压缩 |
| `scripts/backup-memory-smb.sh` | SMB 备份 |

---

## 🔧 配置

```yaml
hindsight-memory:
  enabled: true
  basePath: ~/.openclaw/agents/main
  storage: hybrid  # file | sqlite | hybrid
  stm:
    bufferFile: memory/stm-current.md
    compressCron: "50 23 * * *"
  kgLite:
    enabled: true
    indexFile: MEMORY.md
  backup:
    enabled: true
    method: smb
    cron: "55 23 * * *"
```

---

## 🏗️ OpenClaw 集成

```yaml
# openclaw.json
agents:
  list:
    - id: main
      skills:
        - hindsight-memory
```

---

## 📌 使用示例

| 用户输入 | 我的行为 |
|---------|---------|
| "记住 XXX" | 写入 STM buffer |
| "这个很重要" | 写入 STM + 标记高优先级 |
| "之前记得什么？" | 检索 KG-Lite + 全文 |
| "查一下项目经验" | 语义搜索 observations 层 |
