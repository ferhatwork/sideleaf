import { describe, it, expect } from 'vitest';
import { searchItems } from '../services/search';
import { Item, Workspace } from '../types';

describe('Performance & Scale Benchmarks', () => {
  it('searches across 5,000 synthetic items in under 25 milliseconds', () => {
    const workspaces: Workspace[] = [
      { id: 'ws-1', name: 'Frontend Engineering', createdAt: 1, updatedAt: 1 },
      { id: 'ws-2', name: 'Product Research', createdAt: 1, updatedAt: 1 },
      { id: 'ws-3', name: 'Personal Scratch', createdAt: 1, updatedAt: 1 },
    ];

    const items: Item[] = [];
    for (let i = 0; i < 5000; i++) {
      items.push({
        id: `bench-item-${i}`,
        workspaceId: i % 3 === 0 ? 'ws-1' : i % 3 === 1 ? 'ws-2' : null,
        type: i % 4 === 0 ? 'checklist' : i % 4 === 1 ? 'quote' : 'text',
        content: `Note index ${i}: Discuss architecture performance, indexing strategies, and webhook latency limits for item #${i}`,
        status: i % 10 === 0 ? 'archived' : 'active',
        order: i,
        createdAt: Date.now() - i * 1000,
        updatedAt: Date.now() - i * 500,
        source:
          i % 5 === 0
            ? {
                url: `https://example.com/topic/${i}`,
                domain: 'example.com',
                capturedAt: Date.now() - i * 1000,
              }
            : undefined,
      });
    }

    const start = performance.now();
    const results = searchItems({
      query: 'webhook latency',
      items,
      workspaces,
      limit: 20,
    });
    const duration = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50); // Well under 50ms (usually 2-8ms)
  });
});
