import { Injectable, inject } from '@angular/core';
import type {
  GridPlacement,
  WidgetId,
  WidgetLayoutItem,
  WorkspaceConfig,
} from '@ncs_software/widget-system';
import {
  WorkspaceState,
  ensureWorkspaceV2,
  toCssGridTemplate,
  type CssGridTemplate,
} from '@ncs_software/widget-system';
import { BehaviorSubject, Observable, from, tap } from 'rxjs';
import { WIDGET_REGISTRY, WIDGET_STATE_ADAPTER, WORKSPACE_LAYOUT_CONFIG } from '../tokens';
import { WidgetStateService } from './widget-state.service';

@Injectable()
export class WorkspaceLayoutService {
  private readonly adapter = inject(WIDGET_STATE_ADAPTER);
  private readonly widgetStateService = inject(WidgetStateService);
  private readonly registry = inject(WIDGET_REGISTRY);
  private readonly layoutDefaults = inject(WORKSPACE_LAYOUT_CONFIG);

  private state: WorkspaceState | null = null;
  private readonly workspaceSubject = new BehaviorSubject<WorkspaceConfig | null>(null);

  readonly workspace$: Observable<WorkspaceConfig | null> = this.workspaceSubject.asObservable();

  get workspace(): WorkspaceConfig | null {
    return this.workspaceSubject.value;
  }

  get gridTemplate(): CssGridTemplate | null {
    if (!this.state) {
      return null;
    }
    return toCssGridTemplate(this.state.items, {
      ...this.state.layoutConfig,
      ...this.layoutDefaults,
    });
  }

  get gridItems(): WidgetLayoutItem[] {
    return this.state?.gridItems() ?? [];
  }

  get tabItems(): WidgetLayoutItem[] {
    return this.state?.tabbedItems() ?? [];
  }

  cellStyle(instanceId: string): { gridColumn: string; gridRow: string } | null {
    const tpl = this.gridTemplate;
    const cell = tpl?.items.find(i => i.instanceId === instanceId);
    return cell ? { gridColumn: cell.gridColumn, gridRow: cell.gridRow } : null;
  }

  loadOrCreate(
    workspaceId: string,
    factory: () => WorkspaceConfig
  ): Observable<WorkspaceConfig> {
    return this.widgetStateService.loadOrCreateDefault(workspaceId, factory).pipe(
      tap(ws => this.initState(ws))
    );
  }

  initState(workspace: WorkspaceConfig): void {
    const v2 = ensureWorkspaceV2(workspace);
    this.state = new WorkspaceState({ adapter: this.adapter, workspace: v2 });
    this.workspaceSubject.next(v2);
  }

  collapseToTab(instanceId: string): Observable<WorkspaceConfig> {
    return from(this.requireState().collapseItemToTab(instanceId)).pipe(
      tap(ws => this.syncState(ws))
    );
  }

  restoreFromTab(instanceId: string): Observable<WorkspaceConfig> {
    return from(this.requireState().restoreItemFromTab(instanceId)).pipe(
      tap(ws => this.syncState(ws))
    );
  }

  setExpanded(instanceId: string, expanded: boolean): Observable<WorkspaceConfig> {
    return from(this.requireState().setItemExpanded(instanceId, expanded)).pipe(
      tap(ws => this.syncState(ws))
    );
  }

  resizeWidget(
    instanceId: string,
    columnDelta: number,
    edge: 'east' | 'west' = 'east'
  ): Observable<WorkspaceConfig> {
    return from(this.requireState().resizeWidget(instanceId, columnDelta, edge)).pipe(
      tap(ws => this.syncState(ws))
    );
  }

  moveWidget(instanceId: string, grid: GridPlacement): Observable<WorkspaceConfig> {
    return from(this.requireState().moveWidget(instanceId, grid)).pipe(
      tap(ws => this.syncState(ws))
    );
  }

  addWidget(widgetId: WidgetId, contextId: string | null): Observable<WorkspaceConfig> {
    return from(this.requireState().addWidget(widgetId, contextId)).pipe(
      tap(ws => this.syncState(ws))
    );
  }

  removeWidget(instanceId: string): Observable<WorkspaceConfig> {
    return from(this.requireState().removeWidget(instanceId)).pipe(
      tap(ws => this.syncState(ws))
    );
  }

  updateItems(items: WidgetLayoutItem[]): Observable<WorkspaceConfig> {
    return from(this.requireState().updateItems(items)).pipe(tap(ws => this.syncState(ws)));
  }

  displayName(widgetId: WidgetId): string {
    return this.registry.get(widgetId)?.displayName ?? widgetId;
  }

  registeredWidgetIds(): WidgetId[] {
    return this.registry.list().map(w => w.widgetId);
  }

  private requireState(): WorkspaceState {
    if (!this.state) {
      throw new Error('WorkspaceLayoutService not initialized');
    }
    return this.state;
  }

  private syncState(workspace: WorkspaceConfig): void {
    this.state!.applyWorkspace(workspace);
    this.workspaceSubject.next(this.state!.config);
  }
}
