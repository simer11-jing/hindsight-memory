/**
 * 混合存储入口
 */

const { FileStorage } = require('./file-store');

/**
 * 混合存储 - 根据配置选择存储后端
 */
class HybridStorage {
  constructor(options = {}) {
    this.config = {
      primary: options.primary || 'file',
      enableSQLite: options.enableSQLite || false,
      enableVector: options.enableVector || false
    };
    
    // 初始化存储后端
    this.storages = {
      file: new FileStorage(options.file || {})
    };
    
    // TODO: SQLite 和 Vector 存储（可选）
    // if (this.config.enableSQLite) {
    //   this.storages.sqlite = new SQLiteStorage(options.sqlite);
    // }
    // if (this.config.enableVector) {
    //   this.storages.vector = new VectorStorage(options.vector);
    // }
  }
  
  /**
   * 获取主存储
   */
  get primary() {
    return this.storages[this.config.primary];
  }
  
  /**
   * 保存
   */
  async save(entry) {
    return this.primary.save(entry);
  }
  
  /**
   * 获取
   */
  async get(id) {
    return this.primary.get(id);
  }
  
  /**
   * 获取全部
   */
  async getAll() {
    return this.primary.getAll();
  }
  
  /**
   * 按层级获取
   */
  async getByLayer(layer) {
    return this.primary.getByLayer(layer);
  }
  
  /**
   * 删除
   */
  async delete(id) {
    return this.primary.delete(id);
  }
  
  /**
   * 查询
   */
  async query(filter) {
    return this.primary.query(filter);
  }
}

/**
 * 创建混合存储实例
 */
function createHybridStorage(options) {
  return new HybridStorage(options);
}

module.exports = {
  HybridStorage,
  createHybridStorage
};