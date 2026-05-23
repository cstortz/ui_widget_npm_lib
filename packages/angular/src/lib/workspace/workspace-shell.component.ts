import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input,
  OnInit,
  AfterContentInit,
  TemplateRef,
  inject,
  signal,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import type { WorkspaceConfig } from '@ncs_software/widget-system';
import {
  createV2WorkspaceDefaults,
  defaultLayoutItemsFromWidgets,
} from '@ncs_software/widget-system';
import { DEFAULT_LAYOUT_ITEMS } from '../tokens';
import { WorkspaceLayoutService } from '../services/workspace-layout.service';
import { GridWorkspaceLayoutComponent } from '../layout/grid-workspace-layout/grid-workspace-layout.component';
import { WidgetTabBarComponent } from '../layout/widget-tab-bar/widget-tab-bar.component';
import { LayoutEditToolbarComponent } from '../layout/layout-edit-toolbar/layout-edit-toolbar.component';
import { TestDebugBridgeComponent } from './test-debug-bridge.component';
import {
  WidgetBodyDirective,
  type WidgetBodyContext,
} from '../layout/widget-body.directive';

@Component({
  selector: 'wdg-workspace-shell',
  standalone: true,
  imports: [
    AsyncPipe,
    GridWorkspaceLayoutComponent,
    WidgetTabBarComponent,
    LayoutEditToolbarComponent,
    TestDebugBridgeComponent,
  ],
  providers: [WorkspaceLayoutService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (layoutService.workspace$ | async; as ws) {
      <div class="wdg-workspace-shell">
        @if (enableTestBridge) {
          <wdg-test-debug-bridge />
        }
        <wdg-layout-edit-toolbar
          [workspaceId]="ws.id"
          (editModeChange)="editMode.set($event)"
        />
        <wdg-widget-tab-bar />
        <wdg-grid-workspace-layout
          [editMode]="editMode()"
          [widgetBodyTemplate]="widgetBodyTemplate"
        />
      </div>
    } @else {
      <p class="wdg-workspace-shell__loading">Loading workspace…</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .wdg-workspace-shell {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 320px;
      }

      .wdg-workspace-shell__loading {
        padding: 1rem;
        margin: 0;
      }

      wdg-grid-workspace-layout {
        flex: 1;
        min-height: 0;
      }
    `,
  ],
})
export class WorkspaceShellComponent implements OnInit, AfterContentInit {
  @Input({ required: true }) workspaceId!: string;
  @Input() defaultWorkspace?: Omit<WorkspaceConfig, 'id' | 'createdAt' | 'updatedAt'>;
  @Input() enableTestBridge = false;
  @ContentChild(WidgetBodyDirective) widgetBody?: WidgetBodyDirective;

  protected readonly layoutService = inject(WorkspaceLayoutService);
  protected readonly editMode = signal(false);
  protected widgetBodyTemplate?: TemplateRef<WidgetBodyContext>;

  private readonly defaultItems = inject(DEFAULT_LAYOUT_ITEMS);

  ngOnInit(): void {
    this.layoutService
      .loadOrCreate(this.workspaceId, () => this.buildDefaultWorkspace())
      .subscribe();
  }

  ngAfterContentInit(): void {
    this.widgetBodyTemplate = this.widgetBody?.templateRef;
  }

  private buildDefaultWorkspace(): WorkspaceConfig {
    const defaults = this.defaultWorkspace;
    const now = new Date();

    if (this.defaultItems.length > 0) {
      return createV2WorkspaceDefaults({
        id: this.workspaceId,
        userId: defaults?.userId ?? 'demo-user',
        name: defaults?.name ?? 'Demo Workspace',
        contextType: defaults?.contextType ?? 'general',
        contextId: defaults?.contextId ?? null,
        items: this.defaultItems,
        layout: defaults?.layout,
        createdAt: now,
        updatedAt: now,
      });
    }

    const widgets = defaults?.widgets ?? [];
    const items =
      widgets.length > 0
        ? defaultLayoutItemsFromWidgets(widgets, defaults?.panelOrder ?? 'primary-left')
        : [];

    return createV2WorkspaceDefaults({
      id: this.workspaceId,
      userId: defaults?.userId ?? 'demo-user',
      name: defaults?.name ?? 'Demo Workspace',
      contextType: defaults?.contextType ?? 'general',
      contextId: defaults?.contextId ?? null,
      items,
      layout: defaults?.layout,
      createdAt: now,
      updatedAt: now,
    });
  }
}
