import { Component, Input, inject } from '@angular/core';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import {
  WidgetPanelComponent,
  WorkspaceLayoutService,
} from '@ncs_software/widget-system-angular';
import { DemoNotesWidgetComponent } from '../widgets/demo-notes-widget.component';
import { DemoChecklistWidgetComponent } from '../widgets/demo-checklist-widget.component';
import { DemoTimerWidgetComponent } from '../widgets/demo-timer-widget.component';
import { DemoLinksWidgetComponent } from '../widgets/demo-links-widget.component';
import { DemoWebsiteWidgetComponent } from '../widgets/demo-website-widget.component';

@Component({
  selector: 'demo-widget-host',
  standalone: true,
  host: {
    class: 'demo-widget-host',
  },
  imports: [
    WidgetPanelComponent,
    DemoNotesWidgetComponent,
    DemoChecklistWidgetComponent,
    DemoTimerWidgetComponent,
    DemoLinksWidgetComponent,
    DemoWebsiteWidgetComponent,
  ],
  template: `
    <wdg-widget-panel
      [title]="titleFor(item)"
      [initialExpanded]="item.expanded"
      [canCollapseToTab]="true"
      (expandedChange)="onExpandedChange($event)"
      (collapseToTab)="onCollapseToTab()"
    >
      @switch (item.widgetId) {
        @case ('demo-notes') {
          <demo-notes-widget [config]="widgetConfig(item)" />
        }
        @case ('demo-checklist') {
          <demo-checklist-widget [config]="widgetConfig(item)" />
        }
        @case ('demo-timer') {
          <demo-timer-widget [item]="item" />
        }
        @case ('demo-links') {
          <demo-links-widget [item]="item" />
        }
        @case ('demo-website') {
          <demo-website-widget [config]="widgetConfig(item)" />
        }
      }
    </wdg-widget-panel>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        width: 100%;
        height: 100%;
        min-height: 0;
      }
    `,
  ],
})
export class DemoWidgetHostComponent {
  @Input({ required: true }) item!: WidgetLayoutItem;

  private readonly layoutService = inject(WorkspaceLayoutService);

  protected titleFor(item: WidgetLayoutItem): string {
    return this.layoutService.displayName(item.widgetId);
  }

  protected widgetConfig(item: WidgetLayoutItem) {
    return {
      widgetId: item.widgetId,
      position: 'primary' as const,
      contextId: item.contextId,
      collapsed: !item.expanded,
    };
  }

  protected onExpandedChange(expanded: boolean): void {
    this.layoutService.setExpanded(this.item.instanceId, expanded).subscribe();
  }

  protected onCollapseToTab(): void {
    this.layoutService.collapseToTab(this.item.instanceId).subscribe();
  }
}
