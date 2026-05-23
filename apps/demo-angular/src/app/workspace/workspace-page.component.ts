import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import {
  WidgetBodyDirective,
  WorkspaceShellComponent,
} from '@ncs_software/widget-system-angular';
import { DemoWidgetHostComponent } from '../widgets/demo-widget-host.component';
import { createDemoLayoutItems } from '../demo-widget-registry';

@Component({
  selector: 'demo-workspace-page',
  standalone: true,
  imports: [WorkspaceShellComponent, WidgetBodyDirective, DemoWidgetHostComponent],
  template: `
    @if (workspaceId(); as id) {
      <div class="demo-workspace-page" data-testid="workspace-page">
        <wdg-workspace-shell
          [workspaceId]="id"
          [defaultWorkspace]="defaultWorkspace(id)"
          [enableTestBridge]="true"
        >
          <ng-template wdgWidgetBody let-item="item">
            <demo-widget-host [item]="item" />
          </ng-template>
        </wdg-workspace-shell>
      </div>
    }
  `,
  styles: [
    `
      .demo-workspace-page {
        display: block;
        height: 100%;
      }

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
      layoutVersion: 2 as const,
      items: createDemoLayoutItems(id),
    };
  }
}
