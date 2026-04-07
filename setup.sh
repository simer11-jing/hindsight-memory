#!/bin/bash

# Hindsight Memory System - 一键安装脚本
# 作者：小爪 (OpenClaw Agent)

set -e

echo "🧠 Hindsight Memory System 安装程序"
echo "======================================"
echo ""

# 定义安装路径
INSTALL_DIR="$HOME/.openclaw/agents/main"
MEMORY_DIR="$INSTALL_DIR/memory"
REFLECTIONS_DIR="$MEMORY_DIR/reflections"

# 检查是否已安装
if [ -f "$INSTALL_DIR/MEMORY.md" ]; then
    echo "⚠️  检测到已存在 MEMORY.md"
    read -p "是否备份并覆盖？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BACKUP_FILE="$INSTALL_DIR/MEMORY.md.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$INSTALL_DIR/MEMORY.md" "$BACKUP_FILE"
        echo "✅ 已备份到: $BACKUP_FILE"
    else
        echo "❌ 安装取消"
        exit 1
    fi
fi

# 创建目录
echo "📁 创建目录..."
mkdir -p "$MEMORY_DIR"
mkdir -p "$REFLECTIONS_DIR"

# 复制模板文件
echo "📝 复制模板文件..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/templates/MEMORY.md" ]; then
    cp "$SCRIPT_DIR/templates/MEMORY.md" "$INSTALL_DIR/MEMORY.md"
    echo "  ✅ MEMORY.md"
fi

if [ -f "$SCRIPT_DIR/templates/DAILY_LOG.md" ]; then
    echo "  ✅ DAILY_LOG.md 模板已准备"
fi

# 设置权限
echo "🔒 设置权限..."
chmod 644 "$INSTALL_DIR/MEMORY.md" 2>/dev/null || true

# 创建初始每日日志
TODAY=$(date +%Y-%m-%d)
if [ ! -f "$MEMORY_DIR/$TODAY.md" ]; then
    touch "$MEMORY_DIR/$TODAY.md"
    echo "# $TODAY 记忆日志" > "$MEMORY_DIR/$TODAY.md"
    echo "" >> "$MEMORY_DIR/$TODAY.md"
    echo "_此文件记录当日工作日志_" >> "$MEMORY_DIR/$TODAY.md"
    echo "  ✅ 创建今日日志: $MEMORY_DIR/$TODAY.md"
fi

# 安装完成
echo ""
echo "======================================"
echo "✅ 安装完成！"
echo ""
echo "📂 安装位置："
echo "   - MEMORY.md: $INSTALL_DIR/MEMORY.md"
echo "   - 每日日志: $MEMORY_DIR/"
echo "   - 反思记录: $REFLECTIONS_DIR/"
echo ""
echo "📚 使用方法："
echo "   1. 编辑 MEMORY.md 添加长期记忆"
echo "   2. 每日日志自动创建在 memory/ 目录"
echo "   3. 运行容量检查: node scripts/memory-capacity-check.js"
echo ""
echo "🐾 小爪 (OpenClaw Agent) 感谢你的使用！"
