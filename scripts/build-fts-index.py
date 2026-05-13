#!/usr/bin/env python3
"""
Build FTS5 index for MEMORY.md + daily memory files + agent comm messages.
- Uses SQLite via Python's sqlite3 (batteries included).
- Guarantees DB directory exists and writes are atomic.
- Posts warnings on failure but never crashes node process.
"""

import os, sys, sqlite3, tempfile, pathlib
BASE = os.getenv('MEMORY_BASE', '/home/jinghao/.openclaw/agents/main')
DB_PATH = os.path.join(BASE, 'memory', 'fts-index.db')
MEMORY = os.path.join(BASE, 'MEMORY.md')
DAILY_DIR = os.path.join(BASE, 'memory')
AGENT_COMM = '/home/jinghao/agent-comm'

def read_lines(fp):
    if not os.path.exists(fp): return []
    with open(fp, 'r', encoding='utf-8') as f: return [l.rstrip('\n') for l in f]

def ensure_dir(p): os.makedirs(p, exist_ok=True)

def build():
    # Ensure DB dir exists
    ensure_dir(os.path.dirname(DB_PATH))

    # Open DB safely; use WAL mode to avoid lock issues with concurrent readers
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        cur.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS fts_memory USING fts5(
                id UNINDEXED,
                src UNINDEXED,
                content,
                tokenize="porter"
            )
        ''')
        cur.execute('DELETE FROM fts_memory')  # clear previous index

        def add_row(src, content):
            row_id = f"{src}-{int(time.time()*1000)}"
            cur.execute('INSERT INTO fts_memory (id, src, content) VALUES (?,?,?)',
                        (row_id, src, content))

        # 1. MEMORY.md (skip markdown headers, empty lines, noise)
        if os.path.exists(MEMORY):
            lines = read_lines(MEMORY)
            for line in lines:
                trimmed = line.strip()
                if not trimmed or trimmed.startswith(('#', '---', '_', '<!--')): continue
                add_row('MEMORY.md', trimmed)

        # 2. Daily memory files
        if os.path.exists(DAILY_DIR):
            for fname in os.listdir(DAILY_DIR):
                if not fname.endswith('.md') or fname in ('MEMORY.md', 'stm-current.md'): continue
                fpath = os.path.join(DAILY_DIR, fname)
                lines = read_lines(fpath)
                for line in lines:
                    trimmed = line.strip()
                    if trimmed and not trimmed.startswith(('#', '---', '_', '<!--')):
                        add_row(fname, trimmed)

        # 3. Agent‑comm messages
        comm_dir = os.path.join(AGENT_COMM, 'inbox')
        if os.path.exists(comm_dir):
            for agent in os.listdir(comm_dir):
                mfile = os.path.join(comm_dir, agent, 'messages.jsonl')
                if not os.path.exists(mfile): continue
                try:
                    for line in read_lines(mfile):
                        if not line: continue
                        try:
                            obj = json.loads(line)
                            content = obj.get('payload', {}).get('content') or obj.get('payload', {}).get('title')
                            if content:
                                add_row(f'comm/{agent}', content)
                        except Exception:
                            continue
                except Exception:
                    continue

        conn.commit()
        print(f'FTS5 index built: {sum(1 for _ in cur.execute("SELECT * FROM fts_memory"))} entries')
    except Exception as e:
        print('ERROR:', e, file=sys.stderr)
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    import json, time
    build()

