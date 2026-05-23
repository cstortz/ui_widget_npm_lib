import { useEffect } from 'react';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import { useWorkspace } from '@ncs_software/widget-system-react';

declare global {
  interface Window {
    __WDG_TEST__?: {
      getItems: () => readonly WidgetLayoutItem[];
    };
  }
}

/** Exposes workspace layout state for Playwright / manual debugging */
export function TestDebugBridge() {
  const workspace = useWorkspace();

  useEffect(() => {
    window.__WDG_TEST__ = {
      getItems: () => workspace?.items ?? [],
    };
    return () => {
      delete window.__WDG_TEST__;
    };
  }, [workspace]);

  return null;
}
