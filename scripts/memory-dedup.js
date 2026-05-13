#!/usr/bin/env node
/**
 * Memory Entry Validator & Dedup
 * - 校验 entry schema (source/confidence/tags required)
 * - 过滤噪音（空标题、系统自引、重复行）
 */

const fs = require('fs');
const path = require('path');

const BASE = process.env.MEMORY_BASE || path.resolve(__dirname, '..', '..');
const MEMORY = path.join(BASE, 'MEMORY.md');

// 最小有效行格式：- xxx {tags:xxx | confidence:0.x}
const VALID_LINE = /^-\s+.+\s*\{tags:\S+\s*\|\s*confidence:[\d.]+\}/;
// 噪音模式
const NOISE = [/^---$/, /^_最后更新/, /^#\s*$/];

function isValidLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  for (const pattern of NOISE) {
    if (pattern.test(trimmed)) return false;
  }
  return VALID_LINE.test(trimmed);
}

function dedupLines(lines) {
  const seen = new Set();
  return lines.filter(line => {
    const trimmed = line.trim();
    if (seen.has(trimmed)) return false;
    if (trimmed && trimmed !== '---') seen.add(trimmed);
    return true;
  });
}

function processMemory() {
  if (!fs.existsSync(MEMORY)) {
    console.log('MEMORY.md not found');
    return;
  }
  const content = fs.readFileSync(MEMORY, 'utf-8');
  const lines = content.split('\n');

  // 保留标题、空行、分隔线
  const header = [];
  const body = [];
  let inHeader = true;

  for (const line of lines) {
    if (inHeader && (line.startsWith('#') || line.startsWith('_') || line === '---')) {
      header.push(line);
      continue;
    }
    if (inHeader && !line.startsWith('#') && line.trim() !== '') {
       inHeader = false;
       header.push(line); // add first non-header line as separator
       continue;
    }
    if (inHeader) {
      header.push(line);
      continue;
    }
    body.push(line);
  }

  // 过滤 + 去重（只针对记忆条目行，保留非条目行）
  const cleaned = [];
  for (const line of body) {
    const trimmed = line.trim();
    if (!trimmed) { cleaned.push(line); continue; }
    if (trimmed.startsWith('#')) { cleaned.push(line); continue; }
    if (trimmed.startsWith('- ') && !isValidLine(line)) {
      console.log(`[filter] removed: ${trimmed.substring(0, 80)}`);
      continue;
    }
    cleaned.push(line);
  }

  const deduped = dedupLines(cleaned);
  const result = [...header, ...deduped].join('\n');

  const removed = lines.length - result.split('\n').length;
  console.log(`Original: ${lines.length} lines`);
  console.log(`Cleaned: ${result.split('\n').length} lines`);
  console.log(`Removed: ${removed} lines`);
  console.log(`${MEMORY} updated`);
  fs.writeFileSync(MEMORY, result);
}

processMemory();
