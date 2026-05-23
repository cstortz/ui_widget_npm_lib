import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import { WorkspaceLayoutService } from '../services/workspace-layout.service';

declare global {
  interface Window {
    __WDG_TEST__?: {
      getItems: () => readonly WidgetLayoutItem[];
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
      getItems: () => this.layoutService.gridItems,
    };
  }

  ngOnDestroy(): void {
    delete window.__WDG_TEST__;
  }
}
