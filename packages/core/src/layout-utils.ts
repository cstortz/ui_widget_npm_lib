import type { WidgetId } from './types.js';

/** Create a unique widget instance id */
export function createWidgetInstanceId(widgetId?: WidgetId): string {
  const suffix = Math.random().toString(36).slice(2, 9);
  const prefix = widgetId ? `${widgetId}-` : '';
  return `wi-${prefix}${Date.now()}-${suffix}`;
}

/** True when workspace uses v2 grid layout */
export function isWorkspaceV2(
  workspace: { layoutVersion?: number; items?: unknown[] }
): boolean {
  return workspace.layoutVersion === 2 && Array.isArray(workspace.items);
}
