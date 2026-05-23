import { inject, Injectable } from '@angular/core';
import type {
  WidgetId,
  WidgetState,
  WidgetStateAdapter,
  WorkspaceConfig,
  WorkspaceContextType,
} from '@ncs_software/widget-system';
import { ensureWorkspaceV2, stateKey } from '@ncs_software/widget-system';
import { from, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { WIDGET_STATE_ADAPTER } from '../tokens';

@Injectable({ providedIn: 'root' })
export class WidgetStateService {
  private readonly adapter = inject(WIDGET_STATE_ADAPTER) as WidgetStateAdapter;
  private readonly cache = new Map<string, WidgetState<unknown>>();

  private cacheKey(widgetId: WidgetId, contextId: string | null): string {
    return stateKey(widgetId, contextId);
  }

  saveState<T>(
    widgetId: WidgetId,
    contextId: string | null,
    payload: T
  ): Observable<WidgetState<T>> {
    return from(this.adapter.saveState(widgetId, contextId, payload)).pipe(
      tap(saved => this.cache.set(this.cacheKey(widgetId, contextId), saved))
    );
  }

  loadState<T>(
    widgetId: WidgetId,
    contextId: string | null
  ): Observable<WidgetState<T> | null> {
    const key = this.cacheKey(widgetId, contextId);
    if (this.cache.has(key)) {
      return of(this.cache.get(key) as WidgetState<T>);
    }

    return from(this.adapter.loadState<T>(widgetId, contextId)).pipe(
      tap(state => {
        if (state) {
          this.cache.set(key, state);
        }
      }),
      catchError(() => of(null))
    );
  }

  clearState(widgetId: WidgetId, contextId: string | null): Observable<void> {
    this.cache.delete(this.cacheKey(widgetId, contextId));
    return from(this.adapter.clearState(widgetId, contextId));
  }

  saveWorkspace(workspace: WorkspaceConfig): Observable<WorkspaceConfig> {
    return from(this.adapter.saveWorkspace(workspace));
  }

  loadWorkspace(workspaceId: string): Observable<WorkspaceConfig | null> {
    return from(this.adapter.loadWorkspace(workspaceId)).pipe(catchError(() => of(null)));
  }

  loadWorkspaceByContext(
    contextType: WorkspaceContextType,
    contextId: string
  ): Observable<WorkspaceConfig | null> {
    return from(this.adapter.loadWorkspaceByContext(contextType, contextId)).pipe(
      catchError(() => of(null))
    );
  }

  listWorkspaces(): Observable<WorkspaceConfig[]> {
    return from(this.adapter.listWorkspaces());
  }

  deleteWorkspace(workspaceId: string): Observable<void> {
    return from(this.adapter.deleteWorkspace(workspaceId));
  }

  /** Load workspace or create and persist a default configuration */
  loadOrCreateDefault(
    workspaceId: string,
    factory: () => WorkspaceConfig
  ): Observable<WorkspaceConfig> {
    return this.loadWorkspace(workspaceId).pipe(
      switchMap(existing => {
        if (existing) {
          return of(ensureWorkspaceV2(existing));
        }
        const created = ensureWorkspaceV2(factory());
        return this.saveWorkspace(created);
      })
    );
  }
}
