# AGENTS.md — UI Widget System

AI coding agents working in this codebase must read this file in full before
generating, editing, or reviewing any code related to the widget layout system,
widget state persistence, the two-panel workspace layout, or any component
that is described as a "widget" in any feature AGENTS.md file.

Read also:
- `AGENTS-feature-7-application-workspace.md` — the first feature built on
  this system; the concrete implementation reference
- `ai-job-search-frontend-prompt.md` — baseline architecture, stack, and
  conventions

---

## Architectural Intent

The widget system defined here is the **intended UI direction for the entire
application**. Feature 7 (Application Workspace) is the first implementation.

The current application architecture — chat shell with sidenav and
feature-specific dialogs — is the baseline. Existing feature components
are not required to migrate immediately. Migration happens incrementally
as features are revisited or extended.

Any new feature built after this document exists should be implemented
as a widget-compatible component from the start. Any agent working on
an existing feature should note migration opportunities but not
rearchitect without an explicit instruction to do so.

**The end state** is an application composed entirely of widgets that the
user can arrange into workspaces suited to their current task — practicing
for an interview, filling out an application, reviewing fit scores. Each
workspace is a named, persistent layout of widgets the user has configured.

**The current state** is a **12-column CSS grid workspace** (v2 layout schema) with
runtime edit mode — drag reorder, column snap resize, expand/contract, and tab-bar
collapse. The legacy two-panel layout remains available as deprecated wrappers for
one release cycle; v1 workspaces auto-migrate on load.

---

## Constraints — Do Not Deviate

| Constraint | Rule |
|---|---|
| Layout math in core | All grid placement, resize snap, and validation logic lives in `@ncs_software/widget-system` `LayoutEngine` — UI packages only handle pointer events |
| v2 schema on save | Persisted workspaces must use `layoutVersion: 2` and `items[]`; run `ensureWorkspaceV2()` when loading legacy configs |
| State is server-side | Widget state is persisted server-side, not in localStorage — it must roam across devices |
| Widget contract is stable | `WidgetConfig`, `WidgetState`, and `WidgetLayoutItem` changes require updating every widget and migration paths |
| Widgets are standalone | Every widget must function correctly when rendered alone, not only inside a workspace grid |
| Framework deps | Angular: existing Material + CDK drag-drop. React: `@dnd-kit/*` in the react package only |
| Future-proof naming | Prefer `GridWorkspaceLayout`, `WidgetLayoutItem`, `WorkspaceLayoutService` over two-panel-specific names for new code |

**Removed constraints (v3.0+):** drag-and-drop reorder, resize handles, and multi-widget grids are now supported in runtime edit mode. See [docs/LAYOUT-V2.md](./docs/LAYOUT-V2.md).

---

## Core Concepts

### Widget
A self-contained Angular component that:
- Declares a `widgetId` — a unique string identifier (e.g. `'resume-panel'`)
- Accepts a `WidgetConfig` input
- Manages its own internal state via signals
- Can save and restore its state via the `WidgetStateService`
- Renders correctly at any width between 320px and 100vw
- Has a defined `widgetMeta` static property describing its capabilities

### Workspace
A named layout configuration owned by a user. A workspace defines:
- Which widgets are present
- Their panel positions (left or right in the current two-panel system)
- The context they are operating in (e.g. which `jobListingId`)
- The persisted state of each widget within this workspace

### Panel
A layout slot in the current two-panel system. There are two panels:
`primary` and `secondary`. Which panel is on the left and which is on
the right is controlled by the `panelOrder` preference on the workspace.
Swapping panels toggles `panelOrder` and persists the preference.

---

## Data Models

Define all types in `libs/shared/data-access/src/lib/widget.types.ts`.

```typescript
// Unique identifier for a widget type — matches the widgetId static property
export type WidgetId =
  | 'resume-panel'            // Feature 7 — resume data reference
  | 'application-guide'       // Feature 7 — application form assistance
  | 'chat'                    // Future migration — existing chat feature
  | 'skills-panel'            // Future migration — existing skills sidenav section
  | 'fit-rankings'            // Future migration — existing fit rankings panel
  | 'skill-plans'             // Future migration — existing skill plans panel
  | 'job-sites'               // Future migration — existing job sites panel
  | 'improvement-tracker';    // Future migration — existing interview improvement panel
// Extend this union as new widgets are created

export type PanelPosition = 'primary' | 'secondary';
export type PanelOrder    = 'primary-left' | 'primary-right';

export interface WidgetMeta {
  widgetId:    WidgetId;
  displayName: string;         // e.g. "Resume Panel"
  description: string;         // one sentence
  minWidthPx:  number;         // minimum viable width — used for future responsive logic
  canCollapse: boolean;        // whether this widget supports a collapsed/header-only state
}

export interface WidgetConfig {
  widgetId:   WidgetId;
  position:   PanelPosition;
  contextId:  string | null;   // e.g. jobListingId — the entity this widget is scoped to
  collapsed:  boolean;         // whether the widget is currently collapsed
}

// The persisted state payload for a specific widget instance.
// Each widget defines its own state shape — this is the envelope.
export interface WidgetState<T = Record<string, unknown>> {
  widgetId:    WidgetId;
  contextId:   string | null;
  payload:     T;              // widget-specific state — typed per widget
  savedAt:     Date;
}

export interface WorkspaceConfig {
  id:          string;
  userId:      string;
  name:        string;         // e.g. "Application — Senior FE Eng @ Acme"
  contextType: WorkspaceContextType;
  contextId:   string | null;  // e.g. jobListingId for an application workspace
  panelOrder:  PanelOrder;     // which panel is on the left
  widgets:     WidgetConfig[]; // ordered — index 0 is primary, index 1 is secondary
  createdAt:   Date;
  updatedAt:   Date;
}

export type WorkspaceContextType =
  | 'job-application'   // Feature 7 workspace
  | 'general';          // future: freeform workspace with no specific job context
```

### Widget-Specific State Shapes

Each widget that uses persistence defines its own state payload type.
Define these in the same file as the widget's other types.

**Resume Panel state** (defined in `feature-7` types):
```typescript
export interface ResumePanelState {
  selectedResumeVersionId: string | null;
  expandedSections:        string[];       // section ids that are expanded
  scrollTop:               number;
}
```

**Application Guide state** (defined in `feature-7` types):
```typescript
export interface ApplicationGuideState {
  activeSection:           string | null;  // current form section in focus
  checkedItems:            string[];       // checklist item ids that are ticked
  usedAnswerIds:           string[];       // answer bank items already copied
  expandedSections:        string[];
}
```

---

## Frontend — Widget Infrastructure

### New Files

```
apps/job-search-web/src/app/
  core/
    services/
      widget-state.service.ts          # Save, load, and clear widget state
    layout/
      workspace-layout/
        workspace-layout.component.ts  # Two-panel layout container
      widget-panel/
        widget-panel.component.ts      # Single panel slot wrapper
      swap-button/
        swap-button.component.ts       # Center swap control

libs/shared/data-access/src/lib/
  widget.types.ts                      # All types defined above
```

---

### `widget-state.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class WidgetStateService {
  private http    = inject(HttpClient);
  private apiBase = environment.apiBaseUrl;

  // In-memory cache keyed by "widgetId:contextId"
  private cache = new Map<string, WidgetState>();

  private cacheKey(widgetId: WidgetId, contextId: string | null): string {
    return `${widgetId}:${contextId ?? 'global'}`;
  }

  saveState<T>(
    widgetId: WidgetId,
    contextId: string | null,
    payload: T
  ): Observable<WidgetState<T>> {
    const state: Omit<WidgetState<T>, 'savedAt'> = { widgetId, contextId, payload };

    return this.http
      .put<WidgetState<T>>(`${this.apiBase}/widgets/state`, state)
      .pipe(
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

    return this.http
      .get<WidgetState<T>>(
        `${this.apiBase}/widgets/state/${widgetId}`,
        { params: contextId ? { contextId } : {} }
      )
      .pipe(
        tap(state => { if (state) this.cache.set(key, state); }),
        catchError(err => {
          if (err.status === 404) return of(null);
          throw err;
        })
      );
  }

  saveWorkspace(workspace: WorkspaceConfig): Observable<WorkspaceConfig> {
    return this.http.put<WorkspaceConfig>(
      `${this.apiBase}/widgets/workspaces/${workspace.id}`,
      workspace
    );
  }

  loadWorkspace(workspaceId: string): Observable<WorkspaceConfig | null> {
    return this.http
      .get<WorkspaceConfig>(`${this.apiBase}/widgets/workspaces/${workspaceId}`)
      .pipe(
        catchError(err => {
          if (err.status === 404) return of(null);
          throw err;
        })
      );
  }

  loadWorkspaceByContext(
    contextType: WorkspaceContextType,
    contextId: string
  ): Observable<WorkspaceConfig | null> {
    return this.http
      .get<WorkspaceConfig>(
        `${this.apiBase}/widgets/workspaces/by-context`,
        { params: { contextType, contextId } }
      )
      .pipe(
        catchError(err => {
          if (err.status === 404) return of(null);
          throw err;
        })
      );
  }

  clearState(widgetId: WidgetId, contextId: string | null): Observable<void> {
    this.cache.delete(this.cacheKey(widgetId, contextId));
    return this.http.delete<void>(
      `${this.apiBase}/widgets/state/${widgetId}`,
      { params: contextId ? { contextId } : {} }
    );
  }
}
```

---

### `WorkspaceLayoutComponent`

The two-panel layout container. Used by Feature 7 and any future workspace
that adopts the widget system.

```typescript
@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="workspace-layout" [class.swapped]="panelOrder() === 'primary-right'">

      <div class="workspace-panel workspace-panel--primary">
        <ng-content select="[primaryPanel]" />
      </div>

      <div class="workspace-swap-column">
        <app-swap-button (swap)="onSwap()" />
      </div>

      <div class="workspace-panel workspace-panel--secondary">
        <ng-content select="[secondaryPanel]" />
      </div>

    </div>
  `,
})
export class WorkspaceLayoutComponent {
  @Input() workspaceId!: string;

  protected panelOrder = signal<PanelOrder>('primary-left');

  private widgetStateService = inject(WidgetStateService);

  ngOnInit(): void {
    // Load persisted panel order for this workspace
    this.widgetStateService
      .loadWorkspace(this.workspaceId)
      .subscribe(ws => {
        if (ws) this.panelOrder.set(ws.panelOrder);
      });
  }

  protected onSwap(): void {
    const next: PanelOrder =
      this.panelOrder() === 'primary-left' ? 'primary-right' : 'primary-left';
    this.panelOrder.set(next);
    // Persist immediately — fire and forget
    this.widgetStateService
      .loadWorkspace(this.workspaceId)
      .pipe(
        switchMap(ws => {
          if (!ws) return EMPTY;
          return this.widgetStateService.saveWorkspace({ ...ws, panelOrder: next });
        })
      )
      .subscribe();
  }
}
```

**SCSS:**
```scss
.workspace-layout {
  display: grid;
  grid-template-columns: 1fr 48px 1fr;
  grid-template-areas: "primary swap secondary";
  height: 100%;
  overflow: hidden;

  &.swapped {
    grid-template-areas: "secondary swap primary";
  }
}

.workspace-panel {
  overflow-y: auto;
  height: 100%;

  &--primary  { grid-area: primary; }
  &--secondary { grid-area: secondary; }
}

.workspace-swap-column {
  grid-area: swap;
  display: flex;
  align-items: center;
  justify-content: center;
}

// Responsive: stack panels vertically below 768px
@media (max-width: 768px) {
  .workspace-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 48px auto;
    grid-template-areas:
      "primary"
      "swap"
      "secondary";

    &.swapped {
      grid-template-areas:
        "secondary"
        "swap"
        "primary";
    }
  }
}
```

---

### `SwapButtonComponent`

A minimal component that emits a `swap` event.

```typescript
@Component({
  selector: 'app-swap-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      class="swap-button"
      aria-label="Swap panel positions"
      matTooltip="Swap panels"
      (click)="swap.emit()">
      <mat-icon>swap_horiz</mat-icon>
    </button>
  `,
})
export class SwapButtonComponent {
  @Output() swap = new EventEmitter<void>();
}
```

On mobile (viewport < 768px) the icon rotates to `swap_vert` to reflect
the vertical stacking. Detect via `BreakpointObserver` from `@angular/cdk/layout`.

---

### `WidgetPanelComponent`

A wrapper for any widget that adds a consistent header, collapse toggle, and
panel chrome. Widgets are projected into this wrapper.

```typescript
@Component({
  selector: 'app-widget-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="widget-panel" [class.widget-panel--collapsed]="collapsed()">

      <mat-card-header class="widget-panel__header">
        <mat-card-title>{{ title }}</mat-card-title>
        <span class="spacer"></span>
        <ng-content select="[headerActions]" />
        <button
          *ngIf="canCollapse"
          mat-icon-button
          [attr.aria-label]="collapsed() ? 'Expand panel' : 'Collapse panel'"
          (click)="toggleCollapse()">
          <mat-icon>{{ collapsed() ? 'expand_more' : 'expand_less' }}</mat-icon>
        </button>
      </mat-card-header>

      <mat-card-content
        class="widget-panel__content"
        [class.widget-panel__content--hidden]="collapsed()">
        <ng-content />
      </mat-card-content>

    </mat-card>
  `,
})
export class WidgetPanelComponent {
  @Input() title!: string;
  @Input() canCollapse = true;
  @Input() initialCollapsed = false;
  @Output() collapseChange = new EventEmitter<boolean>();

  protected collapsed = signal(false);

  ngOnInit(): void {
    this.collapsed.set(this.initialCollapsed);
  }

  protected toggleCollapse(): void {
    this.collapsed.update(c => !c);
    this.collapseChange.emit(this.collapsed());
  }
}
```

---

## Widget Contract

Every component that is a widget must:

1. **Declare a static `widgetMeta` property** of type `WidgetMeta`
2. **Accept a `config` input** of type `WidgetConfig`
3. **Call `WidgetStateService.loadState()` on init** to restore persisted state
4. **Call `WidgetStateService.saveState()` on any meaningful state change**
   — debounced to at most once per 2 seconds to avoid excessive API calls
5. **Function correctly when `config.contextId` is null** — not all workspaces
   have a job listing context
6. **Emit a `stateChange` output** of type `WidgetState` when state is saved,
   so the parent workspace can react if needed

```typescript
// Minimal widget interface — implement this pattern in every widget component
abstract class WidgetBase<TState> {
  static widgetMeta: WidgetMeta;              // static — not on instance

  @Input() config!: WidgetConfig;
  @Output() stateChange = new EventEmitter<WidgetState<TState>>();

  protected widgetStateService = inject(WidgetStateService);
  protected state = signal<TState | null>(null);

  ngOnInit(): void {
    this.widgetStateService
      .loadState<TState>(this.config.widgetId, this.config.contextId)
      .subscribe(saved => {
        if (saved) this.state.set(saved.payload);
        else       this.state.set(this.defaultState());
      });
  }

  protected abstract defaultState(): TState;

  protected saveState(payload: TState): void {
    this.widgetStateService
      .saveState(this.config.widgetId, this.config.contextId, payload)
      .subscribe(saved => this.stateChange.emit(saved));
  }
}
```

Note: `WidgetBase` is a pattern reference, not a required base class.
Angular standalone components cannot easily extend abstract classes with
injected dependencies. Implement the pattern directly in each widget
component using `inject()` rather than inheriting from this class.

---

## Backend — New Service: `widget-state`

Create a new backend service module. Follows existing conventions.

### New API Endpoints

All endpoints are under `/api/widgets`. All require a valid Auth0 Bearer token.
All operations are scoped to the authenticated user — users cannot read or
write another user's widget state.

---

#### `PUT /api/widgets/state`

Creates or replaces the widget state for a specific widget + context combination.

**Request body:** `WidgetState` (without `savedAt` — set server-side)

**Response 200:** `WidgetState` (with `savedAt` populated)

---

#### `GET /api/widgets/state/:widgetId`

Returns the persisted state for a widget. `contextId` is an optional
query parameter — omit for global (non-context-specific) widget state.

**Query params:**
- `contextId` — optional

**Response 200:** `WidgetState`
**Response 404:** No state saved for this widget + context combination.

---

#### `DELETE /api/widgets/state/:widgetId`

Deletes the persisted state for a widget + context combination.
Used when the context is deleted (e.g. a job listing is removed).

**Query params:**
- `contextId` — optional

**Response 204**

---

#### `PUT /api/widgets/workspaces/:workspaceId`

Creates or updates a workspace configuration.

**Request body:** `WorkspaceConfig`

**Response 200:** `WorkspaceConfig`

---

#### `GET /api/widgets/workspaces/:workspaceId`

Returns a workspace configuration by ID.

**Response 200:** `WorkspaceConfig`
**Response 404**

---

#### `GET /api/widgets/workspaces/by-context`

Returns the workspace configuration for a specific context.
Used to restore a workspace when the user navigates to a job listing's
application workspace.

**Query params:**
- `contextType` (required)
- `contextId` (required)

**Response 200:** `WorkspaceConfig`
**Response 404:** No workspace saved for this context — caller creates a default.

---

#### `GET /api/widgets/workspaces`

Returns all workspace configurations for the authenticated user.

**Response 200:** `WorkspaceConfig[]` (most recently updated first)

---

## Routing

Add a new top-level route to `app.routes.ts`:

```typescript
{
  path: 'workspace/:workspaceId',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./features/workspace/workspace-shell/workspace-shell.component')
      .then(m => m.WorkspaceShellComponent),
}
```

The `WorkspaceShellComponent` loads the `WorkspaceConfig` for the given
`workspaceId`, instantiates the correct widgets for each panel, and wraps
them in `WorkspaceLayoutComponent`.

When navigating to a job application workspace from the chat interface
(e.g. from the `JobDescriptionCardComponent` "Apply" button), the backend
creates or retrieves the workspace config for that `jobListingId` and
returns the `workspaceId` to navigate to.

---

## Future Migration Notes

The following existing components are candidates for migration to the widget
system. Do not migrate them until explicitly instructed — note them here
for planning purposes only.

| Existing Component | Future Widget ID | Notes |
|---|---|---|
| `ChatWindowComponent` + `ChatInputComponent` | `chat` | Largest migration — requires chat service to accept contextId scoping |
| `SkillsPanelComponent` | `skills-panel` | Currently in sidenav — would become a standalone widget |
| `FitRankingsPanelComponent` | `fit-rankings` | Good candidate for a widget — self-contained data |
| `SkillPlansPanelComponent` | `skill-plans` | Self-contained — straightforward migration |
| `JobSitesPanelComponent` | `job-sites` | Self-contained — straightforward migration |
| `ImprovementPanelComponent` | `improvement-tracker` | Self-contained — straightforward migration |

When the full widget migration is undertaken, the sidenav and its panel
sections are removed and replaced by a workspace management interface
where the user builds their own layout from available widgets.

---

## Backend API Contract Summary

```
PUT    /api/widgets/state
         body: WidgetState (without savedAt)
         → 200 WidgetState

GET    /api/widgets/state/:widgetId
         query: contextId?
         → 200 WidgetState
         → 404

DELETE /api/widgets/state/:widgetId
         query: contextId?
         → 204

PUT    /api/widgets/workspaces/:workspaceId
         body: WorkspaceConfig
         → 200 WorkspaceConfig

GET    /api/widgets/workspaces/:workspaceId
         → 200 WorkspaceConfig
         → 404

GET    /api/widgets/workspaces/by-context
         query: contextType, contextId
         → 200 WorkspaceConfig
         → 404

GET    /api/widgets/workspaces
         → 200 WorkspaceConfig[]
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `loadState` returns 404 | Widget initialises with `defaultState()` — not an error condition |
| `saveState` fails | Log warning; do not surface to user — state will be saved on the next change; in-memory signal remains correct |
| `loadWorkspace` returns 404 | `WorkspaceShellComponent` creates a default `WorkspaceConfig` with `panelOrder: 'primary-left'` and immediately persists it |
| Swap button clicked while save is in flight | Allow the swap — optimistic update; the in-flight save will complete or retry without blocking the UI |
| `contextId` deleted (job listing removed) | Call `DELETE /api/widgets/state` for all widgets associated with that context; call `DELETE /api/widgets/workspaces/:workspaceId` for the workspace |

---

## Implementation Order

1. **`widget.types.ts`** — all types before any service or component code
2. **`PUT /api/widgets/state` and `GET /api/widgets/state/:widgetId`** — state persistence foundation
3. **`PUT /api/widgets/workspaces/:workspaceId` and `GET` endpoints** — workspace config persistence
4. **`WidgetStateService`** — frontend service with in-memory cache
5. **`SwapButtonComponent`** — simplest component; build and test in isolation
6. **`WidgetPanelComponent`** — panel wrapper with collapse toggle
7. **`WorkspaceLayoutComponent`** — two-panel grid with swap behavior
8. **`WorkspaceShellComponent`** — route component that loads workspace config
9. **Routing** — add `workspace/:workspaceId` route to `app.routes.ts`
10. **Feature 7 widgets** — `ResumePanelWidget` and `ApplicationGuideWidget`
    per `AGENTS-feature-7-application-workspace.md`

---

## Testing Requirements

| Layer | What to Test |
|---|---|
| `WidgetStateService` | Cache hit returns without HTTP call; 404 returns null not error; `saveState` updates cache after success |
| `WorkspaceLayoutComponent` | `swapped` class applied when `panelOrder` is `primary-right`; swap persisted after button click; panel order restored from saved workspace on init |
| `SwapButtonComponent` | `swap` event emitted on click; icon is `swap_vert` below 768px breakpoint |
| `WidgetPanelComponent` | Collapsed state toggles on button click; `collapseChange` emitted; content hidden when collapsed |
| Backend state endpoints | State scoped to authenticated user; 404 on missing state; PUT replaces not merges |
| Backend workspace endpoints | `by-context` returns correct workspace; 404 when no workspace for context |
| Context deletion cleanup | Widget state and workspace deleted when job listing is removed |
| Responsive layout | Panels stack vertically below 768px; swap button shows vertical icon |
