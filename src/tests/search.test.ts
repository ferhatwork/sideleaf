import { describe, it, expect } from 'vitest';
import { searchItems } from '../services/search';
import { Item, Workspace } from '../types';

describe('Search Engine', () => {
  const workspaces: Workspace[] = [
    { id: 'ws-1', name: 'Website Redesign', createdAt: 1000, updatedAt: 1000 },
    { id: 'ws-2', name: 'Client Research', createdAt: 1000, updatedAt: 1000 },
  ];

  const items: Item[] = [
    {
      id: '1',
      workspaceId: 'ws-1',
      type: 'text',
      content: 'Check Stripe webhook limits for checkout',
      status: 'active',
      order: 1,
      createdAt: Date.now() - 5000,
      updatedAt: Date.now() - 5000,
    },
    {
      id: '2',
      workspaceId: 'ws-2',
      type: 'link',
      content: 'Competitor pricing analysis',
      status: 'active',
      order: 2,
      source: {
        url: 'https://stripe.com/pricing',
        domain: 'stripe.com',
        capturedAt: Date.now() - 10000,
      },
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
    },
    {
      id: '3',
      workspaceId: null,
      type: 'checklist',
      content: 'Ask client about billing invoices',
      checked: false,
      status: 'active',
      order: 3,
      createdAt: Date.now() - 20000,
      updatedAt: Date.now() - 20000,
    },
    {
      id: '4',
      workspaceId: 'ws-1',
      type: 'text',
      content: 'Archived old layout designs',
      status: 'archived',
      order: 4,
      createdAt: Date.now() - 50000,
      updatedAt: Date.now() - 50000,
    },
  ];

  it('finds exact phrase in content and ranks it first', () => {
    const results = searchItems({
      query: 'Stripe webhook',
      items,
      workspaces,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe('1');
    expect(results[0].matchedFields).toContain('content');
  });

  it('finds items by source domain', () => {
    const results = searchItems({
      query: 'stripe.com',
      items,
      workspaces,
    });
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('2');
    expect(results[0].matchedFields).toContain('source-url');
  });

  it('finds items by workspace name', () => {
    const results = searchItems({
      query: 'Website Redesign',
      items,
      workspaces,
    });
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('1');
    expect(results[0].matchedFields).toContain('workspace');
  });

  it('respects status filter for archived items', () => {
    const activeOnly = searchItems({
      query: 'layout',
      items,
      workspaces,
      statusFilter: 'active',
    });
    expect(activeOnly.length).toBe(0);

    const all = searchItems({
      query: 'layout',
      items,
      workspaces,
      statusFilter: 'all',
    });
    expect(all.length).toBe(1);
    expect(all[0].item.id).toBe('4');
  });

  it('returns empty array for whitespace query', () => {
    const results = searchItems({
      query: '   ',
      items,
      workspaces,
    });
    expect(results).toEqual([]);
  });
});
