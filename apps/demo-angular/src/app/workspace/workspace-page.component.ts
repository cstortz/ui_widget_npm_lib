import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import type { WidgetConfig, WidgetId, WorkspaceConfig } from '@ncs_software/widget-system';
import {
  WidgetPanelComponent,
  WidgetStateService,
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
      @if (ready()) {
        <wdg-workspace-shell
          [workspaceId]="id"
          [defaultWorkspace]="defaultWorkspace(id)"
        >
          <div primaryPanel>
            <wdg-widget-panel
              title="Notes"
              [initialCollapsed]="notesCollapsed()"
              (collapseChange)="onNotesCollapse($event)"
            >
              <demo-notes-widget [config]="primaryConfig(id)" />
            </wdg-widget-panel>
          </div>
          <div secondaryPanel>
            <wdg-widget-panel
              title="Checklist"
              [initialCollapsed]="checklistCollapsed()"
              (collapseChange)="onChecklistCollapse($event)"
            >
              <demo-checklist-widget [config]="secondaryConfig(id)" />
            </wdg-widget-panel>
          </div>
        </wdg-workspace-shell>
      } @else {
        <p>Loading workspace…</p>
      }
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
  private readonly widgetStateService = inject(WidgetStateService);

  protected readonly workspaceId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('workspaceId') ?? 'demo')),
    { initialValue: 'demo' }
  );

  protected readonly ready = signal(false);
  protected readonly notesCollapsed = signal(false);
  protected readonly checklistCollapsed = signal(false);

  constructor() {
    effect(() => {
      const id = this.workspaceId();
      this.ready.set(false);
      this.widgetStateService
        .loadOrCreateDefault(id, () => this.buildDefaultWorkspace(id))
        .subscribe(ws => {
          this.notesCollapsed.set(
            ws.widgets.find(w => w.widgetId === 'demo-notes')?.collapsed ?? false
          );
          this.checklistCollapsed.set(
            ws.widgets.find(w => w.widgetId === 'demo-checklist')?.collapsed ?? false
          );
          this.ready.set(true);
        });
    });
  }

  protected defaultWorkspace(id: string) {
    return {
      userId: 'demo-user',
      name: `Demo Workspace (${id})`,
      contextType: 'general' as const,
      contextId: null,
      panelOrder: 'primary-left' as const,
      widgets: [
        this.primaryConfig(id),
        this.secondaryConfig(id),
      ],
    };
  }

  protected primaryConfig(workspaceId: string): WidgetConfig {
    return {
      widgetId: 'demo-notes',
      position: 'primary',
      contextId: workspaceId,
      collapsed: this.notesCollapsed(),
    };
  }

  protected secondaryConfig(workspaceId: string): WidgetConfig {
    return {
      widgetId: 'demo-checklist',
      position: 'secondary',
      contextId: workspaceId,
      collapsed: this.checklistCollapsed(),
    };
  }

  protected onNotesCollapse(collapsed: boolean): void {
    this.notesCollapsed.set(collapsed);
    this.persistCollapsed('demo-notes', collapsed);
  }

  protected onChecklistCollapse(collapsed: boolean): void {
    this.checklistCollapsed.set(collapsed);
    this.persistCollapsed('demo-checklist', collapsed);
  }

  private buildDefaultWorkspace(id: string): WorkspaceConfig {
    const now = new Date();
    return {
      id,
      userId: 'demo-user',
      name: `Demo Workspace (${id})`,
      contextType: 'general',
      contextId: null,
      panelOrder: 'primary-left',
      widgets: [
        {
          widgetId: 'demo-notes',
          position: 'primary',
          contextId: id,
          collapsed: false,
        },
        {
          widgetId: 'demo-checklist',
          position: 'secondary',
          contextId: id,
          collapsed: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
  }

  private persistCollapsed(widgetId: WidgetId, collapsed: boolean): void {
    const id = this.workspaceId();
    this.widgetStateService
      .loadWorkspace(id)
      .pipe(
        switchMap(ws => {
          if (!ws) {
            return EMPTY;
          }
          const widgets = ws.widgets.map(w =>
            w.widgetId === widgetId ? { ...w, collapsed } : w
          );
          return this.widgetStateService.saveWorkspace({ ...ws, widgets });
        })
      )
      .subscribe();
  }
}
