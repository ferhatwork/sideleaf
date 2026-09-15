import { describe, expect, it } from 'vitest';
import { createItemRecord } from '../utils/domain';

describe('note formatting data', () => {
  it('keeps multiline content and formatting when creating a note', () => {
    const item = createItemRecord(
      {
        content: 'Tişört\nPantolon\nAksesuar',
        formatting: {
          bold: true,
          italic: true,
          color: '#2563eb',
          fontFamily: 'serif',
          listStyle: 'bullet',
        },
      },
      'workspace-products',
      1000
    );

    expect(item.content).toBe('Tişört\nPantolon\nAksesuar');
    expect(item.formatting).toEqual({
      bold: true,
      italic: true,
      color: '#2563eb',
      fontFamily: 'serif',
      listStyle: 'bullet',
    });
  });

  it('leaves formatting optional for existing plain notes', () => {
    const item = createItemRecord({ content: 'Plain note' }, null, 1000);

    expect(item.formatting).toBeUndefined();
  });
});
