import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import { firstValueFrom } from 'rxjs';
import { WorkspaceLayoutService } from '../services/workspace-layout.service';

declare global {
  interface Window {
    __WDG_TEST__?: {
      getItems: () => readonly WidgetLayoutItem[];
      collapseToTab: (instanceId: string) => Promise<unknown>;
    };
  }
}

/** Exposes workspace layout state for Playwright / manual debugging */
@Component({
  selector: 'wdg-test-debug-bridge',
  standalone: true,
  template: '',
})
export class TestDebugBridgeComponent implements OnInit, OnDestroy {
  private readonly layoutService = inject(WorkspaceLayoutService);

  ngOnInit(): void {
    window.__WDG_TEST__ = {
      getItems: () => this.layoutService.workspace?.items ?? [],
      collapseToTab: (instanceId: string) =>
        firstValueFrom(this.layoutService.collapseToTab(instanceId)),
    };
  }

  ngOnDestroy(): void {
    delete window.__WDG_TEST__;
  }
}
