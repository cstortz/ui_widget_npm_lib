import type { WorkspaceConfig } from '@ncs_software/widget-system';
import { vi } from 'vitest';

export function mockMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

export function makeWorkspace(overrides: Partial<WorkspaceConfig> = {}): WorkspaceConfig {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'ws-1',
    userId: 'user-1',
    name: 'Test Workspace',
    contextType: 'general',
    contextId: null,
    panelOrder: 'primary-left',
    widgets: [
      {
        widgetId: 'demo-notes',
        position: 'primary',
        contextId: 'ws-1',
        collapsed: false,
      },
      {
        widgetId: 'demo-checklist',
        position: 'secondary',
        contextId: 'ws-1',
        collapsed: false,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
