import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { WIDGET_STATE_ADAPTER, type WidgetSystemConfig } from './tokens';

/** Configure widget-system-angular with a persistence adapter from @ncs_software/widget-system */
export function provideWidgetSystem(config: WidgetSystemConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: WIDGET_STATE_ADAPTER, useValue: config.adapter },
  ]);
}
