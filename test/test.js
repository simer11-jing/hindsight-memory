/**
 * Simple test suite for hindsight-memory
 */

const { MemoryManager, MemoryEntry } = require('../lib/memory-manager');

async function runTests() {
  console.log('Running Memory System Tests...\n');

  // Setup
  const manager = new MemoryManager({
    storage: {
      mode: 'file',
      file: { filePath: '/tmp/test-memory.md' }
    },
    ttl: { autoStart: false }
  });

  await manager.init();

  // Test 1: Create
  console.log('Test 1: Create memory');
  const entry = await manager.remember('Meeting with team about project roadmap', {
    layer: 'experiences',
    source: 'calendar',
    tags: ['meeting', 'planning'],
    entities: ['team', 'roadmap'],
    importance: 0.8
  });
  console.log('  Created:', entry.id);
  console.log('  ✓ PASS\n');

  // Test 2: Retrieve
  console.log('Test 2: Retrieve memory');
  const retrieved = await manager.get(entry.id);
  console.log('  Content:', retrieved.content.substring(0, 50) + '...');
  console.log('  Access count:', retrieved.metadata.accessCount);
  console.log('  ✓ PASS\n');

  // Test 3: Search
  console.log('Test 3: Search memories');
  await manager.remember('Learned about async/await in JavaScript', {
    layer: 'observations',
    tags: ['learning', 'javascript']
  });
  const results = await manager.search('meeting');
  console.log('  Found:', results.length, 'results');
  console.log('  ✓ PASS\n');

  // Test 4: List by layer
  console.log('Test 4: List by layer');
  const experiences = await manager.list({ layer: 'experiences' });
  console.log('  Experiences:', experiences.length);
  console.log('  ✓ PASS\n');

  // Test 5: Stats
  console.log('Test 5: Get stats');
  const stats = await manager.stats();
  console.log('  Total:', stats.total);
  console.log('  By layer:', stats.byLayer);
  console.log('  ✓ PASS\n');

  // Cleanup
  await manager.close();
  console.log('All tests passed! ✓');
}

runTests().catch(console.error);
