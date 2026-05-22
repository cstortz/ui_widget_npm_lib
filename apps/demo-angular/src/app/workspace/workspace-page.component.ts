import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import type { WidgetConfig } from '@ncs_software/widget-system';
import {
  WidgetPanelComponent,
  WorkspaceShellComponent,
} from '@ncs_software/widget-system-angular';
import { DemoNotesWidgetComponent } from '../widgets/demo-notes-widget.component';
import { DemoChecklistWidgetComponent } from '../widgets/demo-checklist-widget.component';

@Component({
  selector: 'demo-workspace-page',
  standalone: true,
  imports: [
    WorkspaceShellComponent,
    WidgetPanelComponent,
    DemoNotesWidgetComponent,
    DemoChecklistWidgetComponent,
  ],
  template: `
    @if (workspaceId(); as id) {
      <wdg-workspace-shell
        [workspaceId]="id"
        [defaultWorkspace]="defaultWorkspace(id)"
      >
        <div primaryPanel>
          <wdg-widget-panel title="Notes" [initialCollapsed]="false">
            <demo-notes-widget [config]="primaryConfig(id)" />
          </wdg-widget-panel>
        </div>
        <div secondaryPanel>
          <wdg-widget-panel title="Checklist" [initialCollapsed]="false">
            <demo-checklist-widget [config]="secondaryConfig(id)" />
          </wdg-widget-panel>
        </div>
      </wdg-workspace-shell>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class WorkspacePageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly workspaceId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('workspaceId') ?? 'demo')),
    { initialValue: 'demo' }
  );

  protected defaultWorkspace(id: string) {
    return {
      userId: 'demo-user',
      name: `Demo Workspace (${id})`,
      contextType: 'general' as const,
      contextId: null,
      panelOrder: 'primary-left' as const,
      widgets: [this.primaryConfig(id), this.secondaryConfig(id)],
    };
  }

  protected primaryConfig(workspaceId: string): WidgetConfig {
    return {
      widgetId: 'demo-notes',
      position: 'primary',
      contextId: workspaceId,
      collapsed: false,
    };
  }

  protected secondaryConfig(workspaceId: string): WidgetConfig {
    return {
      widgetId: 'demo-checklist',
      position: 'secondary',
      contextId: workspaceId,
      collapsed: false,
    };
  }
}
