import { useEffect } from 'react';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import { useWorkspace, useWorkspaceLayoutService } from '@ncs_software/widget-system-react';

declare global {
  interface Window {
    __WDG_TEST__?: {
      getItems: () => readonly WidgetLayoutItem[];
      collapseToTab: (instanceId: string) => Promise<unknown>;
    };
  }
}

/** Exposes workspace layout state for Playwright / manual debugging */
export function TestDebugBridge() {
  const workspace = useWorkspace();
  const layoutService = useWorkspaceLayoutService();

  useEffect(() => {
    window.__WDG_TEST__ = {
      getItems: () => workspace?.items ?? [],
      collapseToTab: (instanceId: string) => layoutService.collapseToTab(instanceId),
    };
    return () => {
      delete window.__WDG_TEST__;
    };
  }, [workspace, layoutService]);

  return null;
}
