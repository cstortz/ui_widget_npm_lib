import type { WorkspaceConfig } from '@ncs_software/widget-system';

export function makeWorkspace(overrides: Partial<WorkspaceConfig> = {}): WorkspaceConfig {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'ws-1',
    userId: 'user-1',
    name: 'Test Workspace',
    contextType: 'general',
    contextId: null,
    panelOrder: 'primary-left',
    widgets: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
