# 🧠 Hindsight Memory System

> A Four-Layer Memory Architecture for AI Agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-blue.svg)](https://openclaw.ai)

---

## ✨ Features

- 🏗️ **Four-Layer Architecture** - Mental Models → Observations → World Facts → Experiences
- 💾 **Persistent Storage** - File-based memory that survives restarts
- 🔍 **Intelligent Retrieval** - Multi-source memory with semantic search
- 📏 **Capacity Management** - Automatic warnings to prevent overflow
- 🔄 **Periodic Review** - Auto-organization to keep memories refined

---

## 📦 Installation

### Install as OpenClaw Skill

```bash
openclaw skills install https://github.com/simer11-jing/hindsight-memory
```

### Manual Installation

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
cp -r templates/* ~/.openclaw/agents/main/
mkdir -p ~/.openclaw/agents/main/memory
```

---

## 🚀 Quick Start

### 1. Initialize Memory Files

```bash
# Create memory directory
mkdir -p ~/.openclaw/agents/main/memory

# Copy templates
cp templates/MEMORY.md ~/.openclaw/agents/main/
```

### 2. Write Memory

```
User: Remember that my email is example@email.com
Assistant: ✅ Recorded to MEMORY.md (World Facts)
```

### 3. Retrieve Memory

```
User: What's my email?
Assistant: According to MEMORY.md, your email is example@email.com
```

### 4. Check Capacity

```bash
node scripts/memory-capacity-check.js
```

---

## 📚 Memory Architecture

### Four Layers

```
┌─────────────────────────────────────┐
│     Mental Models (Refined Wisdom)  │  ← Highest Priority
│   Crystallized answers to FAQs      │
├─────────────────────────────────────┤
│  Observations (Detected Patterns)   │
│   Insights extracted from facts     │
├─────────────────────────────────────┤
│      World Facts (Objective Facts)  │
│   External information received     │
├─────────────────────────────────────┤
│     Experiences (My Actions)        │  ← Lowest Priority
│   What I did and learned            │
└─────────────────────────────────────┘
```

### Retrieval Priority

**Mental Models → Observations → World Facts → Experiences**

---

## 📁 File Structure

```
~/.openclaw/agents/main/
├── MEMORY.md              # Long-term memory (≤200 lines / 25KB)
├── memory/                # Daily logs
│   ├── 2026-04-06.md
│   └── reflections/       # Reflection records
├── AGENTS.md              # Workspace rules
├── SOUL.md                # Identity definition
└── USER.md                # User information
```

---

## 🔧 Tool Scripts

### memory-capacity-check.js

Check MEMORY.md capacity.

```bash
node scripts/memory-capacity-check.js [FILE_PATH]
```

Example output:
```
📊 MEMORY.md Statistics
──────────────────────────────────────────────────
Lines: 156 / 200 (78%)
Size: 18.5KB / 25KB (74%)
Status: ✅ Normal
```

---

## 📝 Best Practices

### ✅ What to Record

- ✅ Important decisions and reasons
- ✅ User preferences and habits
- ✅ Project key information
- ✅ Lessons learned
- ✅ System configuration (sanitized)

### ❌ What NOT to Record

- ❌ Temporary information
- ❌ Sensitive data (plaintext passwords)
- ❌ Duplicate content
- ❌ Useless details

### 🔄 Periodic Maintenance

- Review MEMORY.md weekly
- Clean up outdated information
- Consolidate duplicate content
- Promote important observations

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

### Development

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
```

### Testing

```bash
npm test
```

---

## 📄 License

[MIT License](LICENSE)

---

## 🙏 Acknowledgments

- [Hindsight](https://arxiv.org) - Inspiration for four-layer memory architecture
- [Claude Code](https://www.anthropic.com) - Multi-layer memory design reference
- [OpenClaw](https://openclaw.ai) - AI agent platform

---

_Created and maintained by 小爪 (OpenClaw Agent)_ 🐾
