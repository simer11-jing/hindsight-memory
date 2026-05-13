#!/usr/bin/env node
/**
 * Build FTS5 Index for MEMORY.md + daily memory files
 * 基于 hindsight-memory 仓库
 */
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const BASE = process.env.MEMORY_BASE || path.resolve(__dirname, '..', '..');
const DB_PATH = path.join(BASE, 'memory', 'fts-index.db');
const MEMORY = path.join(BASE, 'MEMORY.md');
const DAILY_DIR = path.join(BASE, 'memory');
const AGENT_COMM = '/home/jinghao/agent-comm';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
}

function buildIndex() {
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_memory USING fts5(
        id UNINDEXED,
        src UNINDEXED,
        content,
        tokenize='porter'
      )
    `);
    db.run(`DELETE FROM fts_memory`);
  });

  let count = 0;
  const sources = [];

  // 1. MEMORY.md
  if (fs.existsSync(MEMORY)) {
    const lines = readLines(MEMORY);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('_')) continue;
      if (trimmed.startsWith('<!--')) continue;
      const id = `memory-${Date.now()}-${count++}`;
      db.run('INSERT INTO fts_memory (id, src, content) VALUES (?, ?, ?)', [id, 'MEMORY.md', trimmed]);
    }
    sources.push(`MEMORY.md: ${count} entries`);
  }

  // 2. Daily memory files
  if (fs.existsSync(DAILY_DIR)) {
    const files = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md' && f !== 'stm-current.md');
    for (const file of files) {
      const filePath = path.join(DAILY_DIR, file);
      const lines = readLines(filePath);
      let fileCount = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('_') || trimmed.startsWith('<!--')) continue;
        const id = `daily-${file}-${Date.now()}-${fileCount++}`;
        db.run('INSERT INTO fts_memory (id, src, content) VALUES (?, ?, ?)', [id, file, trimmed]);
      }
      if (fileCount) sources.push(`${file}: ${fileCount} entries`);
      count += fileCount;
    }
  }

  // 3. Agent-comm messages
  if (fs.existsSync(AGENT_COMM)) {
    const inboxDir = path.join(AGENT_COMM, 'inbox');
    if (fs.existsSync(inboxDir)) {
      for (const agent of fs.readdirSync(inboxDir)) {
        const messagesFile = path.join(inboxDir, agent, 'messages.jsonl');
        if (!fs.existsSync(messagesFile)) continue;
        const lines = readLines(messagesFile);
        let msgCount = 0;
        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            const content = msg.payload?.content || msg.payload?.title || '';
            if (!content) continue;
            const id = `comm-${agent}-${Date.now()}-${msgCount++}`;
            db.run('INSERT INTO fts_memory (id, src, content) VALUES (?, ?, ?)', [id, `comm/${agent}`, content]);
          } catch {}
        }
        if (msgCount) sources.push(`comm/${agent}: ${msgCount} entries`);
        count += msgCount;
      }
    }
  }

  db.close();
  console.log(`FTS5 index built: ${count} total entries`);
  sources.forEach(s => console.log(`  ${s}`));
}

buildIndex();
