/**
 * Hindsight Memory Library
 */

module.exports = {
  MemoryManager: require('./memory-manager'),
  MemoryEntry: require('./memory-entry'),
  createMemoryManager: require('./memory-manager').createMemoryManager,
  LAYERS: require('./memory-entry').LAYERS,
  LAYER_DEFINITIONS: require('./memory-entry').LAYER_DEFINITIONS
};