/**
 * 配置文件管理 - 支持自定义云端 API
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
    ttl: { ephemeral: 'session', experiences: 90, observations: 180, worldFacts: -1, mentalModels: -1 }
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
    type: 'local',
    provider: 'xenova',
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    device: 'cpu',
    threshold: 0.7,
    // 云端配置
    cloudProvider: 'custom',    // openai, cohere, custom
    cloudApiKey: '',            // API Key
    cloudModel: '',             // 模型名
    cloudBaseURL: '',           // 自定义 API 地址
    cloudDimensions: 1536       // 向量维度
  },
  
  retrieval: {
    defaultLimit: 10,
    hybridRrfK: 60,
    enableKeyword: true,
    enableSemantic: true
  }
};

// 可用模型列表
const MODELS = {
  // 本地
  'Xenova/all-MiniLM-L6-v2': { type: 'local', name: 'MiniLM-L6', dim: 384, desc: '轻量快速' },
  'Xenova/all-mpnet-base-v2': { type: 'local', name: 'MPNet', dim: 768, desc: '高精度' },
  'Xenova/bge-small-zh-v1.5': { type: 'local', name: 'BGE-Small-ZH', dim: 512, desc: '中文首选' },
  'Xenova/bge-base-zh-v1.5': { type: 'local', name: 'BGE-Base-ZH', dim: 768, desc: '中文高精度' },
  
  // 云端 (通用)
  'text-embedding-3-small': { type: 'cloud', provider: 'openai', name: 'OpenAI-3-Small', dim: 1536 },
  'text-embedding-3-large': { type: 'cloud', provider: 'openai', name: 'OpenAI-3-Large', dim: 3072 },
  'text-embedding-ada-002': { type: 'cloud', provider: 'openai', name: 'Ada-002', dim: 1536 }
};

class ConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(os.homedir(), '.openclaw', 'agents', 'main', 'memory-config.json');
    this.config = this.load();
  }
  
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        return this.merge(DEFAULT_CONFIG, JSON.parse(fs.readFileSync(this.configPath, 'utf-8')));
      }
    } catch (e) { console.warn('⚠️ 配置加载失败'); }
    return { ...DEFAULT_CONFIG };
  }
  
  merge(defaults, user) {
    const result = { ...defaults };
    for (const key in user) {
      if (typeof user[key] === 'object' && !Array.isArray(user[key])) {
        result[key] = this.merge(defaults[key] || {}, user[key]);
      } else result[key] = user[key];
    }
    return result;
  }
  
  save() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }
  
  get(key) { return key.split('.').reduce((o, k) => o?.[k], this.config); }
  
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
    if (options.model) this.set('vector.model', options.model);
    if (options.dimensions) this.set('vector.dimensions', options.dimensions);
    if (options.device) this.set('vector.device', options.device);
    if (options.apiKey) this.set('vector.cloudApiKey', options.apiKey);
    if (options.baseURL) this.set('vector.cloudBaseURL', options.baseURL);
    if (options.cloudModel) this.set('vector.cloudModel', options.cloudModel);
    this.save();
  }
  
  disableVector() {
    this.set('vector.enabled', false);
    this.save();
  }
  
  listModels() {
    console.log('\n========== 本地模型 ==========');
    for (const [id, m] of Object.entries(MODELS)) {
      if (m.type === 'local') {
        console.log(`  ${id} | ${m.name} | ${m.dim}维 | ${m.desc}`);
      }
    }
    console.log('\n========== 云端模型 ==========');
    console.log('  text-embedding-3-small | 1536维 | OpenAI');
    console.log('  text-embedding-3-large | 3072维 | OpenAI');
    console.log('  text-embedding-ada-002 | 1536维 | OpenAI');
    console.log('  (支持任意 OpenAI 兼容 API)');
  }
  
  setCloudConfig(apiKey, baseURL, model, dimensions) {
    if (apiKey) this.set('vector.cloudApiKey', apiKey);
    if (baseURL) this.set('vector.cloudBaseURL', baseURL);
    if (model) this.set('vector.cloudModel', model);
    if (dimensions) this.set('vector.cloudDimensions', dimensions);
    this.save();
  }
  
  showConfig() {
    const v = this.config.vector;
    console.log(`
╔════════════════════════════════════╗
║       向量检索配置                  ║
╚════════════════════════════════════╝

状态: ${v.enabled ? '✅ 启用' : '❌ 禁用'}
类型: ${v.type}

${v.type === 'local' ? `
模型: ${v.model}
维度: ${v.dimensions}
设备: ${v.device}
` : `
API: ${v.cloudBaseURL || 'OpenAI 默认'}
模型: ${v.cloudModel}
维度: ${v.cloudDimensions}
Key: ${v.cloudApiKey ? '✅ 已配置' : '❌ 未配置'}
`}
`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const config = new ConfigManager();
  
  if (!args.length || args[0] === 'show') {
    config.showConfig();
    process.exit(0);
  }
  
  const cmd = args[0];
  switch (cmd) {
    case 'models':
      config.listModels();
      break;
    case 'enable-local':
      config.enableVector({ type: 'local', model: args[1] || 'Xenova/all-MiniLM-L6-v2' });
      console.log('✅ 已启用本地模型');
      break;
    case 'enable-cloud':
      const apiKey = process.env.OPENAI_API_KEY || args[1] || '';
      const baseURL = args[2] || '';
      const model = args[3] || 'text-embedding-3-small';
      config.enableVector({ type: 'cloud', apiKey, baseURL, cloudModel: model });
      console.log('✅ 已启用云端模型');
      break;
    case 'disable':
      config.disableVector();
      console.log('✅ 已禁用');
      break;
    case 'set-url':
      if (args[1]) {
        config.setCloudConfig(null, args[1]);
        console.log('✅ API 地址已设置:', args[1]);
      }
      break;
    case 'set-key':
      if (args[1]) {
        config.setCloudConfig(args[1]);
        console.log('✅ API Key 已设置');
      }
      break;
    default:
      console.log('用法: node config.js [show|models|enable-local|enable-cloud|disable|set-url|set-key]');
  }
}

module.exports = { ConfigManager, DEFAULT_CONFIG, MODELS };
if (require.main === module) main();
