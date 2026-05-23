import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MemoryWidgetStateAdapter } from '@ncs_software/widget-system';
import { provideWidgetSystem } from '@ncs_software/widget-system-angular';
import { routes } from './app.routes';
import { createDemoLayoutItems, demoWidgetRegistry } from './demo-widget-registry';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideWidgetSystem({
      adapter: new MemoryWidgetStateAdapter(),
      registry: demoWidgetRegistry,
      permissions: {
        editLayout: true,
        addWidgets: true,
        removeWidgets: true,
        resize: true,
        reorder: true,
      },
      defaultItems: createDemoLayoutItems('demo'),
    }),
  ],
};
