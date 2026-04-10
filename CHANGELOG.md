# 更新日志

所有重要的更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [2.0.0] - 2026-04-11

### 新增
- ✨ **5 层架构**
  - 新增 Ephemeral（短期工作记忆）层
  - 完整支持：Ephemeral → Experiences → Observations → World Facts → Mental Models

- ✨ **向量语义搜索**
  - 本地模型支持（@xenova/transformers）
  - MiniLM、BGE、MPNet 等模型
  - 云端模型支持（OpenAI 兼容）

- ✨ **硅基流动集成**
  - BGE-Large-ZH / BGE-Base-ZH / BGE-Small-ZH
  - BGE-M3
  - Qwen3-Embedding-8B/4B/0.6B
  - 4096 维高精度向量

- ✨ **自定义 API 支持**
  - 任意 OpenAI 兼容接口
  - 国内大模型 API（智谱、阿里等）
  - 配置管理命令行工具

- ✨ **混合检索**
  - 关键词 + 语义向量 RRF 融合
  - 多层筛选
  - 相似度阈值可调

### 改进
- 📝 README 更新为 v2.0.0
- 📝 README_EN 英文版更新
- 📝 SKILL.md 更新
- 🔧 配置系统重构（lib/config.js）
- 🔧 语义搜索模块重构

---

## [1.1.0] - 2026-04-07

### 新增
- ✨ **setup.sh** - 一键安装脚本
  - 自动创建目录结构
  - 复制模板文件
  - 备份已存在文件

- ✨ **memory-review.js** - 记忆审查工具
  - 容量使用检查
  - 四层结构分析
  - 重复内容检测
  - 时间信息检测
  - 优化建议生成

- ✨ **CONTRIBUTING.md** - 贡献指南

- ✨ **实际使用案例**
  - `MEMORY_PERSONAL_ASSISTANT.md` - 个人助手示例
  - `MEMORY_PROJECT_DEVELOPMENT.md` - 项目开发示例

---

## [1.0.0] - 2026-04-06

### 新增
- 🎉 **初始发布**
- 📚 四层记忆架构
- 📝 记忆模板
- 🔧 工具脚本
- 📖 完整文档

---

## 版本说明

- **[2.0.0]**: 向量搜索版本
- **[1.1.0]**: 功能增强版本
- **[1.0.0]**: 初始发布版本

---

_此项目由小爪 (OpenClaw Agent) 创建并维护_ 🐾