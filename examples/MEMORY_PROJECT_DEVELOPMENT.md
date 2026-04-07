# MEMORY.md - 使用案例：项目开发助手

_基于 Hindsight 四层架构的项目记忆示例_

---

## 🧠 Mental Models（精炼智慧）

### 开发原则
- **简洁优先**: 代码越少越好，可读性第一
- **测试驱动**: 先写测试，再写代码
- **文档完善**: 好文档胜过千言万语
- **渐进重构**: 小步快跑，持续改进

### 技术决策原则
- 优先使用成熟稳定的库
- 避免过度工程化
- 性能优化要有数据支撑
- 安全性不可妥协

---

## 👁️ Observations（观察到的模式）

### 项目生命周期
- **初始阶段**: 快速原型，功能验证
- **开发阶段**: 迭代开发，持续集成
- **维护阶段**: Bug 修复，性能优化

### 常见问题模式
- **依赖冲突**: 使用虚拟环境隔离
- **性能瓶颈**: 先分析再优化
- **部署问题**: 环境一致性最重要

---

## 🌍 World Facts（客观事实）

### 项目信息

| 项目 | 技术栈 | 状态 |
|------|--------|------|
| **费用核算助手** | Python, Gradio, OpenPyXL | v3.0.4 生产中 |
| **Hindsight Memory** | Node.js, Markdown | v1.0.0 开发中 |

### 开发环境

| 工具 | 版本 | 用途 |
|------|------|------|
| **Python** | 3.11 | 后端开发 |
| **Node.js** | v22.22.2 | 脚本开发 |
| **Git** | 2.43 | 版本控制 |
| **VS Code** | 1.114.0 | 代码编辑 |

### API 配置

| 平台 | 模型 | 额度 |
|------|------|------|
| dayoukewei | glm-5 | 1000次/天 |
| tokenland | MiniMax, Gemini | 8000万 tokens |

---

## 🎭 Experiences（我的经历）

### 2026-04-07

**Hindsight Memory 项目**
- ✅ 创建 setup.sh 安装脚本
- ✅ 开发 memory-review.js 审查工具
- ✅ 编写 CONTRIBUTING.md 贡献指南
- ✅ 添加实际使用案例
- 📝 准备发布 v1.1.0

**学到的经验**
- 安装脚本要处理已存在文件的情况
- 审查工具要提供具体可行的建议
- 文档要详尽但不过度复杂

### 2026-04-06

**OpenClaw 升级**
- 从 2026.4.2 升级到 2026.4.5
- 遇到依赖缺失问题（@buape/carbon）
- 通过重新安装解决

**学到的经验**
- 升级前备份配置
- 遇到依赖问题先尝试重装
- 保持耐心，逐步排查

### 2026-04-05

**记忆系统优化**
- 研究 Hindsight 四层架构
- 实现记忆自动提取
- 创建反思 Skill

**学到的经验**
- 架构设计要先想清楚再动手
- 自动化要适度，保留人工审核
- 文档和代码同等重要

---

## 🔧 待办事项

| 任务 | 优先级 | 状态 |
|------|--------|------|
| 发布 Hindsight Memory v1.1.0 | 高 | 🔄 进行中 |
| 编写单元测试 | 中 | 📋 待办 |
| 添加 Web 可视化 | 低 | 📋 待办 |

---

## 📝 技术笔记

### Python 开发
```python
# 虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 依赖管理
pip freeze > requirements.txt
pip install -r requirements.txt
```

### Git 工作流
```bash
# 功能分支
git checkout -b feature/new-feature
git commit -m "feat: 添加新功能"
git push origin feature/new-feature

# 合并到主分支
git checkout main
git merge feature/new-feature
```

---

## 📊 项目统计

- **代码行数**: 5000+ (Python + JavaScript)
- **文档字数**: 8000+ (Markdown)
- **提交次数**: 50+
- **开发时长**: 2 周

_最后更新: 2026-04-07_

---

_此示例展示了一个项目开发助手的记忆配置_
