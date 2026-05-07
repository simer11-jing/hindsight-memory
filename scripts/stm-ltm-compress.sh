#!/usr/bin/env bash
# STM → LTM Compression Script
# 将短期记忆缓冲区的内容压缩归档到长期记忆

set -euo pipefail

AGENT_DIR="/home/jinghao/.openclaw/agents/main"
MEMORY_DIR="$AGENT_DIR/memory"
STM_FILE="$MEMORY_DIR/stm-current.md"
MEMORY_FILE="$AGENT_DIR/MEMORY.md"
TODAY=$(date +%Y-%m-%d)
DAILY_FILE="$MEMORY_DIR/${TODAY}.md"
STAMP=$(date +%Y-%m-%d\ %H:%M\ %Z)

echo "=== STM → LTM Compression ==="
echo "Start: $STAMP"
echo "STM: $STM_FILE"

# Check if STM has meaningful content (more than just template)
STM_SIZE=$(stat -c%s "$STM_FILE" 2>/dev/null || echo 0)
if [ "$STM_SIZE" -lt 200 ]; then
    echo "STM buffer is empty or too short, skipping."
    exit 0
fi

# Extract content from sections using awk (more robust)
DECISIONS=$(awk '/^### 关键决策/,/^### / {if(/^### /) exit; if(!/^### / && !/^$/ && !/^<!--/ && !/^>/) print}' "$STM_FILE" | head -20 | tr '\n' '|' | sed 's/|$//')
PREFERENCES=$(awk '/^### 用户偏好/,/^### / {if(/^### /) exit; if(!/^### / && !/^$/ && !/^<!--/ && !/^>/) print}' "$STM_FILE" | head -20 | tr '\n' '|' | sed 's/|$//')
FACTS=$(awk '/^### 待归档/,0 {if(!/^### / && !/^$/ && !/^<!--/ && !/^>/) print}' "$STM_FILE" | head -20 | tr '\n' '|' | sed 's/|$//')

echo "Decisions: ${DECISIONS:0:100}"
echo "Preferences: ${PREFERENCES:0:100}"
echo "Facts: ${FACTS:0:100}"

HAS_CONTENT=0
[ -n "$DECISIONS" ] && HAS_CONTENT=1
[ -n "$PREFERENCES" ] && HAS_CONTENT=1
[ -n "$FACTS" ] && HAS_CONTENT=1

if [ "$HAS_CONTENT" -eq 0 ]; then
    echo "No content to archive, skipping."
    exit 0
fi

# Create daily file if not exists
if [ ! -f "$DAILY_FILE" ]; then
    cat > "$DAILY_FILE" << EOF
# Daily Memory - ${TODAY}

EOF
fi

# Append STM compression results
{
    echo ""
    echo "## STM 归档 - $STAMP"
    echo ""
    if [ -n "$DECISIONS" ]; then
        echo "**关键决策**: ${DECISIONS}"
        echo ""
    fi
    if [ -n "$PREFERENCES" ]; then
        echo "**用户偏好变化**: ${PREFERENCES}"
        echo ""
    fi
    if [ -n "$FACTS" ]; then
        echo "**新增事实**: ${FACTS}"
        echo ""
    fi
} >> "$DAILY_FILE"

# Also extract KG triples (lines containing "->")
{
    echo ""
    echo "**KG 更新**:"
    echo "$FACTS" | tr '|' '\n' | grep "->" | sed 's/^/  - /'
} >> "$DAILY_FILE"

# Clear STM buffer (keep template)
cat > "$STM_FILE" << 'TEMPLATE'
# STM - 当前会话缓冲

> 实时记录当前会话的关键决策、临时状态、用户偏好变化。
> 会话结束后，这些内容将被压缩/归档到 LTM。

## 📋 本次会话记录

### 会话信息
- **会话开始**: SESSION_TIME

### 关键决策
<!-- 在此记录本次会话中做出的重要决策 -->

### 用户偏好/变化
<!-- 在此记录用户新暴露的偏好或变化 -->

### 待归档到 LTM 的事实
<!-- 在此记录需要持久化的新信息 -->

TEMPLATE

# Update timestamp
sed -i "s/SESSION_TIME/$(date +%Y-%m-%d\ %H:%M\ %Z)/" "$STM_FILE"

echo ""
echo "=== Compression Complete ==="
echo "Archived to: $DAILY_FILE"
echo "End: $(date +%Y-%m-%d\ %H:%M\ %Z)"