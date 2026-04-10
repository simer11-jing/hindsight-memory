/**
 * 配置文件管理 - 支持本地 + 云端向量模型
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

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
    type: 'local',          // 'local' 或 'cloud'
    provider: 'xenova',
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    device: 'cpu',
    batchSize: 32,
    threshold: 0.7,
    // 云端配置
    cloudProvider: 'openai',  // openai, cohere
    cloudApiKey: '',          // API Key
    cloudModel: '',           // 云端模型
    cloudBaseURL: ''          // 自定义 API 地址
  },
  
  retrieval: {
    defaultLimit: 10,
    hybridRrfK: 60,
    enableKeyword: true,
    enableSemantic: true
  }
};

const EMBEDDING_MODELS = {
  // ===== 本地模型 =====
  'Xenova/all-MiniLM-L6-v2': {
    type: 'local', name: 'MiniLM-L6-v2', dimensions: 384, lang: 'English',
    speed: '⚡⚡⚡ fast', size: '~90MB', description: '轻量快速，英文为主'
  },
  'Xenova/all-mpnet-base-v2': {
    type: 'local', name: 'MPNet-Base', dimensions: 768, lang: 'English',
    speed: '⚡⚡ medium', size: '~420MB', description: '高精度英文'
  },
  'Xenova/bge-small-zh-v1.5': {
    type: 'local', name: 'BGE-Small-ZH', dimensions: 512, lang: '中文',
    speed: '⚡⚡⚡ fast', size: '~130MB', description: '🏆 中文首选'
  },
  'Xenova/bge-base-zh-v1.5': {
    type: 'local', name: 'BGE-Base-ZH', dimensions: 768, lang: '中文',
    speed: '⚡⚡ medium', size: '~410MB', description: '中文高精度'
  },
  'Xenova/multilingual-MiniLM-L12-v2': {
    type: 'local', name: 'Multi-MiniLM', dimensions: 384, lang: '50+语言',
    speed: '⚡⚡⚡ fast', size: '~250MB', description: '多语言支持'
  },
  
  // ===== 云端模型 =====
  'openai:text-embedding-3-small': {
    type: 'cloud', provider: 'openai', name: 'OpenAI-3-Small',
    dimensions: 1536, lang: 'Multi', description: 'OpenAI 最新模型，性价比高'
  },
  'openai:text-embedding-3-large': {
    type: 'cloud', provider: 'openai', name: 'OpenAI-3-Large',
    dimensions: 3072, lang: 'Multi', description: 'OpenAI 最强模型'
  },
  'openai:text-embedding-ada-002': {
    type: 'cloud', provider: 'openai', name: 'OpenAI-Ada',
    dimensions: 1536, lang: 'Multi', description: '经典模型'
  },
  'cohere:embed-english-v3.0': {
    type: 'cloud', provider: 'cohere', name: 'Cohere-EN-v3',
    dimensions: 1024, lang: 'English', description: 'Cohere 英文模型'
  },
  'cohere:embed-multilingual-v3.0': {
    type: 'cloud', provider: 'cohere', name: 'Cohere-Multi-v3',
    dimensions: 1024, lang: '100+语言', description: 'Cohere 多语言模型'
  }
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
    } catch (e) { console.warn('⚠️ 配置加载失败:', e.message); }
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
    console.log('✅ 配置已保存');
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
    if (options.type) this.set('vector.type', options.type);
    if (options.model) {
      this.set('vector.model', options.model);
      if (options.dimensions) this.set('vector.dimensions', options.dimensions);
    }
    if (options.device) this.set('vector.device', options.device);
    if (options.cloudProvider) this.set('vector.cloudProvider', options.cloudProvider);
    if (options.cloudApiKey) this.set('vector.cloudApiKey', options.cloudApiKey);
    if (options.cloudModel) this.set('vector.cloudModel', options.cloudModel);
    this.save();
  }
  
  disableVector() {
    this.set('vector.enabled', false);
    this.set('storage.enableVector', false);
    this.save();
  }
  
  listModels() {
    console.log(`\n╔═══════════════════════════════════════════════════════════╗
║            可用的 Embedding 模型                         ║
╚═══════════════════════════════════════════════════════════╝
`);
    
    console.log('═══ 💾 本地模型 ═══');
    for (const [id, m] of Object.entries(EMBEDDING_MODELS)) {
      if (m.type === 'local') {
        const current = id === this.get('vector.model') ? ' ✅ 当前' : '';
        console.log(`  ${id}${current}
     维度: ${m.dimensions} | 语言: ${m.lang}
     ${m.speed} | ${m.size}
     ${m.description}\n`);
      }
    }
    
    console.log('═══ ☁️ 云端模型 ═══');
    for (const [id, m] of Object.entries(EMBEDDING_MODELS)) {
      if (m.type === 'cloud') {
        const current = id === this.get('vector.cloudModel') ? ' ✅ 当前' : '';
        console.log(`  ${id}${current}
     提供商: ${m.provider} | 维度: ${m.dimensions}
     ${m.description}\n`);
      }
    }
  }
  
  setModel(modelId) {
    if (!EMBEDDING_MODELS[modelId]) {
      console.error('❌ 未知模型');
      return false;
    }
    const m = EMBEDDING_MODELS[modelId];
    
    if (m.type === 'local') {
      this.set('vector.type', 'local');
      this.set('vector.model', modelId);
      this.set('vector.dimensions', m.dimensions);
    } else {
      this.set('vector.type', 'cloud');
      this.set('vector.cloudProvider', m.provider);
      this.set('vector.cloudModel', modelId);
      this.set('vector.dimensions', m.dimensions);
    }
    this.save();
    console.log(`✅ 已切换到: ${m.name} (${m.type})`);
    return true;
  }
  
  setCloudApiKey(apiKey) {
    this.set('vector.cloudApiKey', apiKey);
    this.save();
    console.log('✅ API Key 已设置');
  }
}

function main() {
  const args = process.argv.slice(2);
  const config = new ConfigManager();
  
  if (args.length === 0 || args[0] === 'show') {
    console.log(`
╔════════════════════════════════════════╗
║   向量检索配置                          ║
╚════════════════════════════════════════╝

状态: ${config.get('vector.enabled') ? '✅ 启用' : '❌ 禁用'}
类型: ${config.get('vector.type')} (local/cloud)
${config.get('vector.type') === 'local' ? `模型: ${config.get('vector.model')}` : `云端: ${config.get('vector.cloudProvider')} - ${config.get('vector.cloudModel')}`}

${config.get('vector.type') === 'cloud' ? `API Key: ${config.get('vector.cloudApiKey') ? '✅ 已配置' : '❌ 未配置'}` : ''}
`);
    process.exit(0);
  }
  
  const cmd = args[0];
  switch (cmd) {
    case 'models':
      config.listModels();
      break;
    case 'enable':
      const opts = { type: 'local' };
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--type' && args[i+1]) opts.type = args[++i];
        if (args[i] === '--model' && args[i+1]) opts.model = args[++i];
        if (args[i] === '--cloud-api-key' && args[i+1]) opts.cloudApiKey = args[++i];
      }
      config.enableVector(opts);
      break;
    case 'disable':
      config.disableVector();
      break;
    case 'set-model':
      if (args[1]) config.setModel(args[1]);
      break;
    case 'set-cloud-key':
      if (args[1]) config.setCloudApiKey(args[1]);
      break;
    default:
      console.log('用法: node config.js [show|models|enable|disable|set-model|set-cloud-key]');
  }
}

module.exports = { ConfigManager, DEFAULT_CONFIG, EMBEDDING_MODELS };
if (require.main === module) main();
