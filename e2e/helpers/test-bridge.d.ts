import type { WidgetLayoutItem } from '@ncs_software/widget-system';

declare global {
  interface Window {
    __WDG_TEST__?: {
      getItems: () => readonly WidgetLayoutItem[];
      collapseToTab: (instanceId: string) => Promise<unknown>;
    };
  }
}

export {};
