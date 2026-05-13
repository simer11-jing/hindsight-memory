#!/usr/bin/env bash
# memory-healthcheck.sh
# 检查 hindsight-memory 各层健康状态
set -euo pipefail

BASE="${MEMORY_BASE:-$HOME/.openclaw/agents/main}"
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

echo "=== Memory Health Check $(date -Is) ==="

# 1. MEMORY.md 容量
if [ -f "$BASE/MEMORY.md" ]; then
  LINES=$(wc -l < "$BASE/MEMORY.md")
  SIZE=$(du -h "$BASE/MEMORY.md" | cut -f1)
  if [ "$LINES" -gt 200 ]; then
    echo "⚠️  MEMORY.md: $LINES 行 (超过 200 行上限) — $SIZE"
  else
    echo "✅ MEMORY.md: $LINES 行 — $SIZE"
  fi
else
  echo "❌ MEMORY.md 不存在"
fi

# 2. STM 文件
if [ -f "$BASE/memory/stm-current.md" ]; then
  STM_AGE=$(stat -c %Y "$BASE/memory/stm-current.md" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  AGE_HOURS=$(( (NOW - STM_AGE) / 3600 ))
  if [ "$AGE_HOURS" -gt 48 ]; then
    echo "⚠️  STM: 未更新 $AGE_HOURS 小时"
  else
    echo "✅ STM: 最近更新 $AGE_HOURS 小时前"
  fi
else
  echo "⚠️  STM: 不存在"
fi

# 3. 昨夜归档
TODAY=$(date +%F)
YESTERDAY=$(date -d "yesterday" +%F)
if [ -f "$BASE/memory/$YESTERDAY.md" ]; then
  echo "✅ 昨夜归档: $YESTERDAY.md 存在"
else
  echo "⚠️  昨夜归档: $YESTERDAY.md 不存在"
fi

# 4. 昨夜压缩
if [ -f "$LOG_DIR/memory-compress.log" ]; then
  LAST_COMPRESS=$(tail -1 "$LOG_DIR/memory-compress.log" 2>/dev/null || true)
  echo "✅ 压缩日志: 最近一次 $LAST_COMPRESS"
else
  echo "⚠️  压缩日志: 不存在"
fi

# 5. embedding 可用性
echo -n "✅ embedding: "
curl -s --max-time 5 "http://192.168.50.2:3000/v1/embeddings" \
  -H "Authorization: Bearer sk-tOE…B3Hy" \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-3-small","input":"test"}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'error' in d:
    print('❌', d['error'].get('message','unknown'))
else:
    print('✅ 可用')
" 2>/dev/null || echo "❌ 不可达"

# 6. FTS5 索引
if [ -f "$BASE/memory/fts-index.db" ]; then
  DB_AGE=$(stat -c %Y "$BASE/memory/fts-index.db" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  AGE_DAYS=$(( (NOW - DB_AGE) / 86400 ))
  if [ "$AGE_DAYS" -gt 7 ]; then
    echo "⚠️  FTS5 索引: 已 $AGE_DAYS 天未重建"
  else
    echo "✅ FTS5 索引: $AGE_DAYS 天前重建"
  fi
else
  echo "⚠️  FTS5 索引: 不存在"
fi

# 7. 跨 Agent 通信
if [ -d "/home/jinghao/agent-comm/inbox/jingcai" ]; then
  PENDING=$(wc -l < /home/jinghao/agent-comm/inbox/jingcai/messages.jsonl 2>/dev/null || echo 0)
  echo "✅ jingcai 收件箱: $PENDING 条待处理"
else
  echo "⚠️  jingcai 收件箱: 不存在"
fi

echo "=== Done ==="
