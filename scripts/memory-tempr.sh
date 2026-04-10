#!/bin/bash

# TEMPR 记忆检索脚本包装器

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="node"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 运行 TEMPR 检索
exec node "${SCRIPT_DIR}/memory-tempr.js" "$@"