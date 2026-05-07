#!/usr/bin/env bash
set -euo pipefail

BASE="/home/jinghao/.openclaw/agents/main"
TMP="$(mktemp -d)"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="totalclaw-memory-${STAMP}.tar.gz"
SHARE="//192.168.50.20/智能体记忆"
REMOTE_DIR="总控爪"
USER="jinghao"
PASS="Jing1234@"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

mkdir -p "$TMP/总控爪-memory"

# Only memory-related files. Do NOT include TOOLS.md or config files with secrets.
cp -a "$BASE/MEMORY.md" "$TMP/总控爪-memory/" 2>/dev/null || true
if [ -d "$BASE/memory" ]; then
  mkdir -p "$TMP/总控爪-memory/memory"
  find "$BASE/memory" -maxdepth 1 -type f -name '*.md' -print0 | xargs -0 -r cp -a -t "$TMP/总控爪-memory/memory/"
fi

cat > "$TMP/总控爪-memory/manifest.json" <<JSON
{
  "agent": "总控爪",
  "created_at": "$(date -Iseconds)",
  "source": "$BASE",
  "contents": ["MEMORY.md", "memory/*.md"],
  "note": "Memory backup only; excludes TOOLS.md and config secrets."
}
JSON

tar -C "$TMP" -czf "$TMP/$ARCHIVE" "总控爪-memory"

# Ensure remote dir exists and upload archive + latest marker.
smbclient "$SHARE" -U "${USER}%${PASS}" -m SMB3 -c "mkdir ${REMOTE_DIR}; cd ${REMOTE_DIR}; put ${TMP}/${ARCHIVE} ${ARCHIVE}; put ${TMP}/总控爪-memory/manifest.json latest-manifest.json" >/tmp/memory-backup-smb.log 2>&1 || {
  cat /tmp/memory-backup-smb.log >&2
  exit 1
}

echo "OK: ${SHARE}/${REMOTE_DIR}/${ARCHIVE}"
