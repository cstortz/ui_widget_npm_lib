import { InjectionToken } from '@angular/core';
import type { WidgetStateAdapter } from '@ncs_software/widget-system';

export const WIDGET_STATE_ADAPTER = new InjectionToken<WidgetStateAdapter>(
  'WIDGET_STATE_ADAPTER'
);

export interface WidgetSystemConfig {
  adapter: WidgetStateAdapter;
}
