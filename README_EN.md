# 🧠 Hindsight Memory System

> A Five-Layer Memory Architecture for AI Agents with Local/Cloud Vector Search

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-blue.svg)](https://openclaw.ai)
[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](https://github.com/simer11-jing/hindsight-memory)

---

## ✨ Features

- 🏗️ **Five-Layer Architecture** - Ephemeral → Experiences → Observations → World Facts → Mental Models
- 💾 **Persistent Storage** - File-based memory that survives restarts
- 🔍 **Intelligent Retrieval** - Keyword + Semantic Vector Hybrid Search
- ☁️ **Cloud Support** - Custom API support (OpenAI Compatible)
- 📏 **Capacity Management** - Automatic warnings to prevent overflow
- ⚙️ **Flexible Configuration** - Multiple models, local/cloud switching
- 🔄 **Periodic Review** - Auto-organization to keep memories refined

---

## 📦 Installation

### Quick Install (Recommended)

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
chmod +x setup.sh
./setup.sh
```

### Manual Installation

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
cp -r templates/* ~/.openclaw/agents/main/
mkdir -p ~/.openclaw/agents/main/memory
```

---

## 🚀 Quick Start

### 1. Initialize

```bash
mkdir -p ~/.openclaw/agents/main/memory
cp templates/MEMORY.md ~/.openclaw/agents/main/
```

### 2. Basic Usage

```bash
# Capacity check
npm run check

# Keyword retrieval
npm run tempr "user preferences"

# Semantic search (requires indexing first)
npm run semantic index
npm run semantic "your query"
```

### 3. Configure Vector Search

```bash
# View current config
npm run semantic

# Enable local vector search
npm run semantic -- config enable-local

# Enable cloud vector search
export OPENAI_API_KEY=your-key
npm run semantic -- config enable-cloud your-key

# Set custom API (for domestic LLM providers)
npm run semantic -- config set-url https://open.bigmodel.cn/api/paas/v4
npm run semantic -- config set-key your-key
```

---

## 📚 Five-Layer Memory Architecture

```
┌─────────────────────────────────────┐
│   💫 Ephemeral (Working Memory)     │  ← Session-level, memory cached
├─────────────────────────────────────┤
│      🎭 Experiences (Events)        │  ← Events, conversation logs
├─────────────────────────────────────┤
│   👁️ Observations (Patterns)        │  ← Insights, patterns
├─────────────────────────────────────┤
│      🌍 World Facts (Knowledge)     │  ← Knowledge, config
├─────────────────────────────────────┤
│   🧠 Mental Models (Wisdom)         │  ← Core principles, best practices
└─────────────────────────────────────┘
```

### Retrieval Priority

**Mental Models → Observations → World Facts → Experiences → Ephemeral**

---

## 🔧 Tool Scripts

### Capacity Check

```bash
npm run check
# or
node scripts/memory-capacity-check.js
```

### TEMPR Retrieval (Keyword + Multi-dimensional)

```bash
npm run tempr "query"
npm run tempr "config" --layer mentalModels
npm run tempr "2026" --temporal
```

### Semantic Vector Search

```bash
# View config
npm run semantic

# Build index (first time)
npm run semantic index

# Semantic search
npm run semantic "your query"
npm run semantic "query" --layer worldFacts --threshold 0.8
```

### Configuration Management

```bash
# List available models
npm run semantic -- config models

# Switch model
npm run semantic -- config set-model Xenova/bge-small-zh-v1.5

# Enable/Disable
npm run semantic -- config disable
```

---

## ☁️ Cloud Vector Models

### Supported Models

| Model | Dimensions | Provider |
|-------|------------|----------|
| text-embedding-3-small | 1536 | OpenAI |
| text-embedding-3-large | 3072 | OpenAI |
| text-embedding-ada-002 | 1536 | OpenAI |

### Custom API (Domestic LLM Support)

```bash
# Zhipu GLM
npm run semantic -- config set-url https://open.bigmodel.cn/api/paas/v4
npm run semantic -- config set-key your-glm-key

# Alibaba DashScope
npm run semantic -- config set-url https://dashscope.aliyuncs.com/api/v1
npm run semantic -- config set-key your-dashscope-key

# SiliconFlow
export SILICONFLOW_API_KEY=your-key
npm run semantic -- config enable-siliconflow

# OpenAI Compatible API
npm run semantic -- config set-url https://your-api.com/v1
npm run semantic -- config set-key your-key
```

---

## 📁 File Structure

```
~/.openclaw/agents/main/
├── MEMORY.md                    # Long-term memory (≤200 lines / 25KB)
├── memory/                      # Daily logs
│   ├── 2026-04-06.md
│   └── reflections/             # Reflection records
├── .memory-index.json           # Vector index
├── memory-config.json           # Configuration file
├── AGENTS.md                    # Workspace rules
├── SOUL.md                      # Identity definition
└── USER.md                      # User information
```

---

## 📦 Project Structure

```
hindsight-memory/
├── lib/                         # Core library
│   ├── memory-entry.js          # Data model
│   ├── memory-manager.js        # Main entry
│   ├── config.js                # Configuration
│   ├── retrieval/               # Retrieval module
│   │   ├── keyword-search.js    # Keyword search
│   │   └── semantic-search.js   # Vector search
│   └── storage/                 # Storage module
├── scripts/                     # CLI tools
│   ├── memory-capacity-check.js
│   ├── memory-tempr.js
│   └── memory-semantic.js
├── templates/                   # Templates
├── ARCHITECTURE.md              # Architecture doc
├── SKILL.md                     # OpenClaw skill
└── README.md
```

---

## ⚙️ Configuration Details

### Config File Location

`~/.openclaw/agents/main/memory-config.json`

### Configuration Options

```json
{
  "vector": {
    "enabled": false,
    "type": "local",          // "local" or "cloud"
    "model": "Xenova/all-MiniLM-L6-v2",
    "dimensions": 384,
    "device": "cpu",
    "threshold": 0.7,
    "cloudBaseURL": "",       // Custom API URL
    "cloudApiKey": "",        // API Key
    "cloudModel": ""          // Cloud model name
  }
}
```

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

```bash
git clone https://github.com/simer11-jing/hindsight-memory.git
cd hindsight-memory
npm install
npm test
```

---

## 📄 License

[MIT License](LICENSE)

---

## 🙏 Acknowledgments

- [Hindsight](https://arxiv.org) - Multi-layer memory architecture inspiration
- [Claude Code](https://www.anthropic.com) - Multi-layer memory design reference
- [OpenClaw](https://openclaw.ai) - AI agent platform
- [Transformers.js](https://xenova.github.io/transformers.js) - Local vector models

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md)

---

_Created and maintained by 小爪 (OpenClaw Agent)_ 🐾