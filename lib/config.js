/**
 * 配置文件管理 - 支持向量检索模型配置
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  version: '2.0.0',
  architecture: '5-layer',
  
  memory: {
    maxLinesPerLayer: 200,
    maxSizeKB: 25,
    autoCompression: true,
    compressionThreshold: 100,
    ttl: {
      ephemeral: 'session',
      experiences: 90,
      observations: 180,
      worldFacts: -1,
      mentalModels: -1
    }
  },
  
  storage: {
    primary: 'file',
    enableSQLite: false,
    enableVector: false,
    fileDir: path.join(os.homedir(), '.openclaw/agents/main'),
    indexFile: path.join(os.homedir(), '.openclaw/agents/main', '.memory-index.json')
  },
  
  vector: {
    enabled: false,
    provider: 'xenova',
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    device: 'cpu',
    batchSize: 32,
    threshold: 0.7
  },
  
  retrieval: {
    defaultLimit: 10,
    hybridRrfK: 60,
    enableKeyword: true,
    enableSemantic: true
  }
};

/**
 * 可用的 embedding 模型
 */
const EMBEDDING_MODELS = {
  // 本地模型 (HuggingFace Transformers)
  'Xenova/all-MiniLM-L6-v2': {
    type: 'local',
    name: 'MiniLM-L6-v2',
    dimensions: 384,
    languages: 'English',
    speed: '⚡⚡⚡ fast',
    size: '~90MB',
    description: '轻量快速，英文为主'
  },
  'Xenova/all-mpnet-base-v2': {
    type: 'local',
    name: 'MPNet-Base',
    dimensions: 768,
    languages: 'English',
    speed: '⚡⚡ medium',
    size: '~420MB',
    description: '精度更高，英文任务首选'
  },
  'Xenova/bge-small-zh-v1.5': {
    type: 'local',
    name: 'BGE-Small-ZH',
    dimensions: 512,
    languages: '中文',
    speed: '⚡⚡⚡ fast',
    size: '~130MB',
    description: '中文优化，开源最强小模型'
  },
  'Xenova/bge-base-zh-v1.5': {
    type: 'local',
    name: 'BGE-Base-ZH',
    dimensions: 768,
    languages: '中文',
    speed: '⚡⚡ medium',
    size: '~410MB',
    description: '中文高精度，适合复杂语义'
  },
  'Xenova/bge-large-zh-v1.5': {
    type: 'local',
    name: 'BGE-Large-ZH',
    dimensions: 1024,
    languages: '中文',
    speed: '⚡ slow',
    size: '~1.3GB',
    description: '中文最强，适合高精度场景'
  },
  'Xenova/multilingual-MiniLM-L12-v2': {
    type: 'local',
    name: 'Multi-MiniLM',
    dimensions: 384,
    languages: '50+ languages',
    speed: '⚡⚡⚡ fast',
    size: '~250MB',
    description: '多语言支持，跨语言检索'
  },
  'Xenova/e5-small-v2': {
    type: 'local',
    name: 'E5-Small',
    dimensions: 384,
    languages: 'English',
    speed: '⚡⚡⚡ fast',
    size: '~120MB',
    description: '英文高效，语义匹配好'
  },
  
  // API 模型 (占位，未来扩展)
  'openai:text-embedding-3-small': {
    type: 'api',
    name: 'OpenAI-Ada-3',
    dimensions: 1536,
    languages: 'Multi',
    speed: 'API',
    description: 'OpenAI API，需要 key'
  }
};

/**
 * 推荐的模型选择
 */
const RECOMMENDED = {
  '中文用户': 'Xenova/bge-small-zh-v1.5',
  '英文用户': 'Xenova/all-MiniLM-L6-v2',
  '高精度': 'Xenova/all-mpnet-base-v2',
  '多语言': 'Xenova/multilingual-MiniLM-L12-v2'
};

class ConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(os.homedir(), '.openclaw', 'agents', 'main', 'memory-config.json');
    this.config = this.load();
  }
  
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return this.merge(DEFAULT_CONFIG, JSON.parse(data));
      }
    } catch (e) {
      console.warn('⚠️ 配置加载失败:', e.message);
    }
    return { ...DEFAULT_CONFIG };
  }
  
  merge(defaults, user) {
    const result = { ...defaults };
    for (const key in user) {
      if (typeof user[key] === 'object' && !Array.isArray(user[key])) {
        result[key] = this.merge(defaults[key] || {}, user[key]);
      } else {
        result[key] = user[key];
      }
    }
    return result;
  }
  
  save() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }
  
  get(key) {
    const keys = key.split('.');
    let value = this.config;
    for (const k of keys) value = value?.[k];
    return value;
  }
  
  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }
  
  enableVector(options = {}) {
    this.set('vector.enabled', true);
    this.set('storage.enableVector', true);
    if (options.model) this.set('vector.model', options.model);
    if (options.device) this.set('vector.device', options.device);
    this.save();
  }
  
  disableVector() {
    this.set('vector.enabled', false);
    this.set('storage.enableVector', false);
    this.save();
  }
  
  listModels() {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗
║           可用的 Embedding 模型                              ║
╚══════════════════════════════════════════════════════════════╝\n`);
    
    for (const [id, m] of Object.entries(EMBEDDING_MODELS)) {
      const current = id === this.get('vector.model') ? ' ✅ 当前使用' : '';
      const typeIcon = m.type === 'local' ? '💾' : '☁️';
      console.log(`${typeIcon} ${id}${current}
   名称: ${m.name} | 维度: ${m.dimensions} | 语言: ${m.languages}
   速度: ${m.size} | 大小: ${m.speed}
   说明: ${m.description}\n`);
    }
    
    console.log('═══ 推荐 ═══');
    for (const [name, id] of Object.entries(RECOMMENDED)) {
      console.log(`  ${name}: ${id}`);
    }
    console.log('');
  }
  
  setModel(modelId) {
    if (!EMBEDDING_MODELS[modelId]) {
      console.error('❌ 未知模型');
      return false;
    }
    const m = EMBEDDING_MODELS[modelId];
    this.set('vector.model', modelId);
    this.set('vector.dimensions', m.dimensions);
    this.save();
    console.log(`✅ 已切换到: ${m.name}`);
    return true;
  }
}

function main() {
  const args = process.argv.slice(2);
  const config = new ConfigManager();
  
  if (args.length === 0 || args[0] === 'show') {
    console.log(config.get('vector.enabled') ? '✅' : '❌', '向量搜索:', config.get('vector.enabled') ? '已启用' : '已禁用');
    console.log('📦 当前模型:', config.get('vector.model'));
    console.log('📐 向量维度:', config.get('vector.dimensions'));
    console.log('⚙️  设备:', config.get('vector.device'));
    process.exit(0);
  }
  
  const cmd = args[0];
  switch (cmd) {
    case 'models':
      config.listModels();
      break;
    case 'enable-vector':
      const opts = {};
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--model' && args[i+1]) opts.model = args[++i];
        if (args[i] === '--device' && args[i+1]) opts.device = args[++i];
      }
      config.enableVector(opts);
      break;
    case 'disable-vector':
      config.disableVector();
      break;
    case 'set-model':
      if (args[1]) config.setModel(args[1]);
      break;
    default:
      console.log('用法: node config.js [show|models|enable-vector|disable-vector|set-model]');
  }
}

module.exports = { ConfigManager, DEFAULT_CONFIG, EMBEDDING_MODELS, RECOMMENDED };
if (require.main === module) main();
