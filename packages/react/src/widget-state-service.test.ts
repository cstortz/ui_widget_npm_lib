import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryWidgetStateAdapter } from '@ncs_software/widget-system';
import { WidgetStateService } from './widget-state-service.js';

describe('WidgetStateService', () => {
  let adapter: MemoryWidgetStateAdapter;
  let service: WidgetStateService;

  beforeEach(() => {
    adapter = new MemoryWidgetStateAdapter();
    service = new WidgetStateService(adapter);
  });

  it('returns cached state without calling the adapter again', async () => {
    const saveSpy = vi.spyOn(adapter, 'loadState');
    await service.saveState('demo-notes', 'ctx-1', { text: 'hello' });
    saveSpy.mockClear();

    const loaded = await service.loadState<{ text: string }>('demo-notes', 'ctx-1');

    expect(loaded?.payload.text).toBe('hello');
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('returns null when adapter load fails', async () => {
    vi.spyOn(adapter, 'loadState').mockRejectedValue(new Error('network'));

    const loaded = await service.loadState('demo-notes', null);

    expect(loaded).toBeNull();
  });

  it('updates cache after saveState', async () => {
    await service.saveState('demo-notes', 'job-1', { text: 'first' });
    const saved = await service.saveState('demo-notes', 'job-1', { text: 'second' });

    expect(saved.payload.text).toBe('second');
    const loaded = await service.loadState<{ text: string }>('demo-notes', 'job-1');
    expect(loaded?.payload.text).toBe('second');
  });

  it('loadOrCreateDefault persists a new workspace', async () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    const workspace = await service.loadOrCreateDefault('new-ws', () => ({
      id: 'new-ws',
      userId: 'demo-user',
      name: 'New',
      contextType: 'general',
      contextId: null,
      panelOrder: 'primary-left',
      widgets: [],
      createdAt: now,
      updatedAt: now,
    }));

    expect(workspace.id).toBe('new-ws');
    const reloaded = await service.loadWorkspace('new-ws');
    expect(reloaded?.name).toBe('New');
  });
});
