import type { WidgetMeta, WidgetId } from './types.js';

/** Register widget types by ID — any project can define its own widget IDs */
export class WidgetRegistry {
  private readonly widgets = new Map<WidgetId, WidgetMeta>();

  register(meta: WidgetMeta): void {
    if (this.widgets.has(meta.widgetId)) {
      throw new Error(`Widget "${meta.widgetId}" is already registered`);
    }
    this.widgets.set(meta.widgetId, meta);
  }

  registerMany(metas: WidgetMeta[]): void {
    for (const meta of metas) {
      this.register(meta);
    }
  }

  get(widgetId: WidgetId): WidgetMeta | undefined {
    return this.widgets.get(widgetId);
  }

  has(widgetId: WidgetId): boolean {
    return this.widgets.has(widgetId);
  }

  list(): WidgetMeta[] {
    return [...this.widgets.values()];
  }

  clear(): void {
    this.widgets.clear();
  }
}

export const defaultWidgetRegistry = new WidgetRegistry();
