# 贡献指南

感谢你考虑为 Hindsight Memory System 做贡献！🐾

---

## 🤔 如何贡献

### 报告问题

如果你发现了 Bug 或有功能建议：

1. 检查 [Issues](https://github.com/simer11-jing/hindsight-memory/issues) 是否已有相同问题
2. 如果没有，创建新 Issue
3. 使用清晰的标题和详细的描述
4. 如果可能，提供复现步骤

### 提交代码

1. **Fork 本仓库**

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行修改**
   - 遵循现有代码风格
   - 添加必要的注释
   - 更新相关文档

4. **提交更改**
   ```bash
   git commit -m "feat: 添加某某功能"
   ```
   
   提交信息格式：
   - `feat:` 新功能
   - `fix:` 修复 Bug
   - `docs:` 文档更新
   - `style:` 代码格式调整
   - `refactor:` 代码重构
   - `test:` 测试相关
   - `chore:` 构建/工具相关

5. **推送到你的 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 描述你的更改
   - 关联相关 Issue
   - 等待审核

---

## 📝 开发指南

### 环境设置

```bash
# 克隆仓库
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory

# 安装依赖（如果有）
npm install

# 运行测试
npm test
```

### 项目结构

```
hindsight-memory/
├── SKILL.md              # Skill 主文档
├── README.md             # 中文 README
├── README_EN.md          # 英文 README
├── CONTRIBUTING.md       # 本文件
├── LICENSE               # MIT 许可证
├── package.json          # npm 配置
├── setup.sh              # 安装脚本
├── scripts/              # 工具脚本
│   ├── memory-capacity-check.js
│   └── memory-review.js
├── templates/            # 模板文件
│   ├── MEMORY.md
│   └── DAILY_LOG.md
└── examples/             # 示例文件
    └── MEMORY.md
```

### 代码规范

- 使用 2 空格缩进
- 函数添加注释说明
- 变量使用 camelCase
- 常量使用 UPPER_CASE

### 文档规范

- 使用 Markdown 格式
- 中文文档使用简体中文
- 代码块指定语言
- 链接使用相对路径（本地文件）

---

## 🎯 贡献方向

### 高优先级

- ✅ 更多工具脚本
- ✅ 实际使用案例
- ✅ 文档改进
- ✅ Bug 修复

### 中优先级

- ⏸️ 测试用例
- ⏸️ 备份功能
- ⏸️ 导出功能

### 低优先级

- ⏸️ Web 可视化界面
- ⏸️ 跨平台支持
- ⏸️ AI 辅助功能

---

## 💡 功能建议

欢迎提出新功能建议！

### 工具脚本

- **memory-backup.js** - 自动备份
- **memory-export.js** - 导出功能
- **memory-merge.js** - 合并工具
- **memory-clean.js** - 自动清理

### 文档改进

- 更多使用示例
- 视频教程
- 常见问题 FAQ
- 最佳实践案例

### 高级功能

- 智能去重
- 自动摘要
- 关联分析
- 时间序列分析

---

## 📜 行为准则

- 友善、尊重他人
- 接受建设性批评
- 关注对项目最有利的事情
- 对社区保持同理心

---

## 🙏 感谢

感谢所有贡献者！

---

_此项目由小爪 (OpenClaw Agent) 创建并维护_

_有问题？在 [Issues](https://github.com/simer11-jing/hindsight-memory/issues) 提问！_
