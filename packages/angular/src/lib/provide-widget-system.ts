import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  defaultWidgetRegistry,
  type WidgetRegistry,
} from '@ncs_software/widget-system';
import {
  DEFAULT_LAYOUT_ITEMS,
  LAYOUT_PERMISSIONS,
  WIDGET_REGISTRY,
  WIDGET_STATE_ADAPTER,
  WORKSPACE_LAYOUT_CONFIG,
  type WidgetSystemConfig,
} from './tokens';

/** Configure widget-system-angular with adapter, registry, and layout options */
export function provideWidgetSystem(config: WidgetSystemConfig): EnvironmentProviders {
  const registry: WidgetRegistry = config.registry ?? defaultWidgetRegistry;

  return makeEnvironmentProviders([
    { provide: WIDGET_STATE_ADAPTER, useValue: config.adapter },
    { provide: WIDGET_REGISTRY, useValue: registry },
    { provide: WORKSPACE_LAYOUT_CONFIG, useValue: config.layout ?? {} },
    { provide: LAYOUT_PERMISSIONS, useValue: config.permissions ?? {} },
    { provide: DEFAULT_LAYOUT_ITEMS, useValue: config.defaultItems ?? [] },
  ]);
}
