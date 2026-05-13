# Hindsight-Memory 架构文档

## 版本：2.1.0

---

## 1. 架构概览

### 1.1 系统概览
Hindsight-Memory 结合了基于 **5 层记忆架构** 的设计与 **MemOS 样式的分层压缩**。系统将短期信息自动归档为长期记忆，并通过实体关系三元组索引实现高速检索。

### 1.2 数据流
```text
用户交互
    → 短期缓冲 (STM)
    → 每日归档 → 长期存储 (LTM)
    → 索引元数据提取 → 检索层
    → 记忆召回 → 生成响应
```

### 1.3 核心层
- **L0 L1 L2 L3 L4**：统一五层架构（Ephemeral → Experiences → Observations → World Facts → Mental Models）
- **MemOS 增强**：STM → LTM → KG (知识图谱) 流转自动化
```
