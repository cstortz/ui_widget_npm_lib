import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryWidgetStateAdapter } from '@ncs_software/widget-system';
import { provideWidgetSystem } from '../provide-widget-system';
import { WidgetStateService } from './widget-state.service';

describe('WidgetStateService', () => {
  let adapter: MemoryWidgetStateAdapter;
  let service: WidgetStateService;

  beforeEach(() => {
    adapter = new MemoryWidgetStateAdapter();
    TestBed.configureTestingModule({
      providers: [provideWidgetSystem({ adapter }), WidgetStateService],
    });
    service = TestBed.inject(WidgetStateService);
  });

  it('returns cached state without calling the adapter again', async () => {
    await firstValueFrom(service.saveState('demo-notes', 'ctx-1', { text: 'hello' }));
    const loadSpy = vi.spyOn(adapter, 'loadState');

    const loaded = await firstValueFrom(
      service.loadState<{ text: string }>('demo-notes', 'ctx-1')
    );

    expect(loaded?.payload.text).toBe('hello');
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('returns null when adapter load fails', async () => {
    vi.spyOn(adapter, 'loadState').mockRejectedValue(new Error('network'));

    const loaded = await firstValueFrom(service.loadState('demo-notes', null));

    expect(loaded).toBeNull();
  });

  it('updates cache after saveState', async () => {
    await firstValueFrom(service.saveState('demo-notes', 'job-1', { text: 'first' }));
    await firstValueFrom(service.saveState('demo-notes', 'job-1', { text: 'second' }));

    const loaded = await firstValueFrom(
      service.loadState<{ text: string }>('demo-notes', 'job-1')
    );
    expect(loaded?.payload.text).toBe('second');
  });

  it('loadOrCreateDefault persists a new workspace', async () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    const workspace = await firstValueFrom(
      service.loadOrCreateDefault('new-ws', () => ({
        id: 'new-ws',
        userId: 'demo-user',
        name: 'New',
        contextType: 'general',
        contextId: null,
        panelOrder: 'primary-left',
        widgets: [],
        createdAt: now,
        updatedAt: now,
      }))
    );

    expect(workspace.id).toBe('new-ws');
    const reloaded = await firstValueFrom(service.loadWorkspace('new-ws'));
    expect(reloaded?.name).toBe('New');
  });
});
