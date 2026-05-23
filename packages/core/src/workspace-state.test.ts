import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryWidgetStateAdapter } from './adapters/memory-adapter.js';
import { LocalStorageWidgetStateAdapter } from './adapters/local-storage-adapter.js';
import { HttpWidgetStateAdapter } from './adapters/http-adapter.js';
import { WidgetRegistry } from './widget-registry.js';
import { WorkspaceState } from './workspace-state.js';
import type { WidgetConfig, WorkspaceConfig } from './types.js';

function makeWorkspace(overrides: Partial<WorkspaceConfig> = {}): WorkspaceConfig {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'ws-1',
    userId: 'user-1',
    name: 'Test Workspace',
    contextType: 'job-application',
    contextId: 'job-1',
    panelOrder: 'primary-left',
    widgets: [
      {
        widgetId: 'resume-panel',
        position: 'primary',
        contextId: 'job-1',
        collapsed: false,
      },
      {
        widgetId: 'application-guide',
        position: 'secondary',
        contextId: 'job-1',
        collapsed: false,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('MemoryWidgetStateAdapter', () => {
  it('saves and loads widget state', async () => {
    const adapter = new MemoryWidgetStateAdapter();
    await adapter.saveState('resume-panel', 'job-1', { scrollTop: 42 });
    const loaded = await adapter.loadState<{ scrollTop: number }>(
      'resume-panel',
      'job-1'
    );
    assert.equal(loaded?.payload.scrollTop, 42);
  });

  it('returns null for missing state', async () => {
    const adapter = new MemoryWidgetStateAdapter();
    const loaded = await adapter.loadState('resume-panel', null);
    assert.equal(loaded, null);
  });

  it('loads workspace by context', async () => {
    const adapter = new MemoryWidgetStateAdapter();
    const workspace = makeWorkspace();
    await adapter.saveWorkspace(workspace);
    const found = await adapter.loadWorkspaceByContext('job-application', 'job-1');
    assert.equal(found?.id, 'ws-1');
  });
});

describe('LocalStorageWidgetStateAdapter', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
  });

  it('persists state across adapter instances', async () => {
    const backing = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    const adapter1 = new LocalStorageWidgetStateAdapter({ storage: backing });
    await adapter1.saveState('chat', null, { message: 'hello' });

    const adapter2 = new LocalStorageWidgetStateAdapter({ storage: backing });
    const loaded = await adapter2.loadState<{ message: string }>('chat', null);
    assert.equal(loaded?.payload.message, 'hello');
  });
});

describe('HttpWidgetStateAdapter', () => {
  it('sends auth header and parses workspace response', async () => {
    let authHeader = '';
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      authHeader = (init?.headers as Record<string, string>).Authorization;
      return new Response(
        JSON.stringify({
          id: 'ws-1',
          userId: 'user-1',
          name: 'Remote',
          contextType: 'general',
          contextId: null,
          panelOrder: 'primary-left',
          widgets: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const adapter = new HttpWidgetStateAdapter({
      baseUrl: '/api',
      getAuthToken: () => 'token-123',
      fetchFn: fetchFn as typeof fetch,
    });

    const workspace = await adapter.loadWorkspace('ws-1');
    assert.equal(authHeader, 'Bearer token-123');
    assert.equal(workspace?.name, 'Remote');
    assert.ok(workspace?.updatedAt instanceof Date);
  });

  it('returns null on 404', async () => {
    const fetchFn = async () => new Response(null, { status: 404 });
    const adapter = new HttpWidgetStateAdapter({
      baseUrl: '/api',
      fetchFn: fetchFn as typeof fetch,
    });
    const state = await adapter.loadState('chat', null);
    assert.equal(state, null);
  });
});

describe('WidgetRegistry', () => {
  it('registers and retrieves widget metadata', () => {
    const registry = new WidgetRegistry();
    registry.register({
      widgetId: 'resume-panel',
      displayName: 'Resume Panel',
      description: 'Reference resume data',
      minWidthPx: 320,
      canCollapse: true,
    });
    assert.equal(registry.get('resume-panel')?.displayName, 'Resume Panel');
    assert.throws(() =>
      registry.register({
        widgetId: 'resume-panel',
        displayName: 'Duplicate',
        description: 'dup',
        minWidthPx: 320,
        canCollapse: true,
      })
    );
  });
});

describe('WorkspaceState', () => {
  it('swaps panel order and persists', async () => {
    const adapter = new MemoryWidgetStateAdapter();
    const workspace = makeWorkspace();
    await adapter.saveWorkspace(workspace);

    const state = new WorkspaceState({ adapter, workspace });
    const before = state.gridItems().map(i => i.grid.colStart);

    await state.swapPanels();

    const after = state.gridItems().map(i => i.grid.colStart);
    assert.notDeepEqual(after, before);

    const reloaded = await adapter.loadWorkspace('ws-1');
    assert.equal(reloaded?.items?.length, 2);
  });

  it('creates default workspace when none exists', async () => {
    const adapter = new MemoryWidgetStateAdapter();
    const widgets: WidgetConfig[] = [
      {
        widgetId: 'resume-panel',
        position: 'primary',
        contextId: 'job-99',
        collapsed: false,
      },
    ];

    const state = await WorkspaceState.loadOrCreate(
      adapter,
      {
        id: 'ws-new',
        userId: 'user-1',
        name: 'New',
        contextType: 'job-application',
        contextId: 'job-99',
        widgets,
      },
      { contextType: 'job-application', contextId: 'job-99' }
    );

    assert.equal(state.config.layoutVersion, 2);
    assert.equal(state.items.length, 1);
  });

  it('updates widget collapse state', async () => {
    const adapter = new MemoryWidgetStateAdapter();
    const v1 = makeWorkspace();
    const state = new WorkspaceState({
      adapter,
      workspace: v1,
    });

    const notesItem = state.items.find(i => i.widgetId === 'resume-panel');
    assert.ok(notesItem);
    await state.collapseItemToTab(notesItem!.instanceId);
    assert.equal(state.getItem(notesItem!.instanceId)?.mode, 'tabbed');
  });

  it('adds and removes widgets in v2 layout', async () => {
    const adapter = new MemoryWidgetStateAdapter();
    const state = new WorkspaceState({
      adapter,
      workspace: makeWorkspace(),
    });

    await state.addWidget('chat', 'job-1');
    assert.equal(state.items.length, 3);

    const added = state.items.find(i => i.widgetId === 'chat');
    assert.ok(added);
    await state.removeWidget(added!.instanceId);
    assert.equal(state.items.length, 2);
  });
});
