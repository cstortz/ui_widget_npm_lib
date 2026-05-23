# Layout v2 — Grid Workspace Schema

Reference for the v2 workspace layout model shipped in `@ncs_software/widget-system` 3.0.0.

## Overview

Workspaces use a **12-column CSS grid** instead of the legacy two-panel model. Each widget is a **layout item** with its own `instanceId`, grid placement, expand/contract state, and optional tab-bar collapse.

- **Contract** (`expanded: false`): widget stays in its grid cell as a header-only strip
- **Tabbed** (`mode: 'tabbed'`): widget is removed from the grid and shown in the top tab bar; `lastGrid` preserves restore position

v1 workspaces (`panelOrder` + `widgets[]`) are **auto-migrated** on load via `ensureWorkspaceV2()`.

## Schema

```typescript
interface WorkspaceConfig {
  layoutVersion: 2;
  layout?: Partial<WorkspaceLayoutConfig>;
  items: WidgetLayoutItem[];
  // deprecated v1 fields retained for migration:
  panelOrder?: PanelOrder;
  widgets?: WidgetConfig[];
}

interface WidgetLayoutItem {
  instanceId: string;       // unique per instance in this workspace
  widgetId: WidgetId;
  contextId: string | null;
  mode: 'grid' | 'tabbed';
  grid: GridPlacement;
  expanded: boolean;
  lastGrid?: GridPlacement;
  tabOrder?: number;
}

interface GridPlacement {
  colStart: number;  // 1-based, inclusive
  colEnd: number;    // exclusive
  rowStart: number;
  rowEnd: number;
}

interface WorkspaceLayoutConfig {
  columns: 12;
  rowHeightPx: number;
  gapPx: number;
  tabBar: { enabled: boolean; maxVisible: number };
}
```

## Core API

| Function / class | Purpose |
|------------------|---------|
| `LayoutEngine` exports in `@ncs_software/widget-system` | `toCssGridTemplate`, `snapResize`, `validateLayout`, `collapseToTab`, `restoreFromTab`, `findNextGridSlot`, `createLayoutItem` |
| `WorkspaceState` | Mutations: `addWidget`, `removeWidget`, `moveWidget`, `resizeWidget`, `setItemExpanded`, `collapseItemToTab`, `restoreItemFromTab`, `updateItems` |
| `migrateWorkspaceV1ToV2` / `ensureWorkspaceV2` | Upgrade legacy configs |
| `WidgetRegistry` | Register widget types with `displayName`, `minWidthPx`, etc. |

## Developer configuration

### Angular

```typescript
import { WidgetRegistry, MemoryWidgetStateAdapter, createLayoutItem, findNextGridSlot } from '@ncs_software/widget-system';
import { provideWidgetSystem } from '@ncs_software/widget-system-angular';

const registry = new WidgetRegistry();
registry.register({ widgetId: 'demo-notes', displayName: 'Notes', description: '…', minWidthPx: 320, canCollapse: true });

provideWidgetSystem({
  adapter: new MemoryWidgetStateAdapter(),
  registry,
  permissions: { editLayout: true, addWidgets: true, resize: true, reorder: true },
  defaultItems: [createLayoutItem('demo-notes', 'ws-1', findNextGridSlot([], 12))],
});
```

```html
<wdg-workspace-shell workspaceId="ws-1">
  <ng-template wdgWidgetBody let-item="item">
    <wdg-widget-panel [title]="item.widgetId" [canCollapseToTab]="true">
      <!-- render widget by item.widgetId -->
    </wdg-widget-panel>
  </ng-template>
</wdg-workspace-shell>
```

### React

```tsx
<WidgetStateProvider adapter={adapter} registry={registry} defaultItems={defaultItems}>
  <WorkspaceShell
    workspaceId="ws-1"
    renderWidget={item => <MyWidgetHost item={item} />}
  />
</WidgetStateProvider>
```

## Runtime edit mode

When `permissions.editLayout` is enabled (default in demos):

1. **Edit layout** toolbar toggles edit mode
2. **Drag reorder** — CDK drag-drop (Angular) or `@dnd-kit` (React)
3. **Resize** — east-edge handle snaps to column boundaries via `snapResize`
4. **Add widget** — menu of registered widget types
5. **Collapse to tab** — panel header action moves widget to tab bar
6. **Reset layout** — restores `defaultItems` from provider config

All mutations persist through the configured `WidgetStateAdapter.saveWorkspace`.

## Migration cookbook

**v1 → v2 on load** (automatic):

| v1 | v2 |
|----|-----|
| `widgets[0]` primary + `panelOrder: primary-left` | 6-col grid cell, row 1, left |
| `widgets[1]` secondary | 6-col grid cell, row 1, right |
| `collapsed: true` | `mode: 'tabbed'` with `lastGrid` preserved |

**Manual seed for new workspaces:**

```typescript
import { createV2WorkspaceDefaults, createLayoutItem, findNextGridSlot } from '@ncs_software/widget-system';

const items = [];
items.push(createLayoutItem('demo-notes', contextId, findNextGridSlot(items, 12, 6)));
items.push(createLayoutItem('demo-checklist', contextId, findNextGridSlot(items, 12, 6)));

const workspace = createV2WorkspaceDefaults({
  id: 'my-workspace',
  userId: 'user-1',
  name: 'My Workspace',
  contextType: 'general',
  contextId: null,
  items,
});
```

## Deprecated v1 APIs

Still exported for one release cycle:

- `WorkspaceLayoutComponent` / `WorkspaceLayout` (two-panel + swap)
- `WorkspaceConfig.panelOrder`, `WorkspaceConfig.widgets`
- `WidgetPanel` `initialCollapsed` / `collapseChange` (use `initialExpanded` / `expandedChange`)
- `WorkspaceState.swapPanels()`, `setWidgetCollapsed()`

Prefer `GridWorkspaceLayout`, `WidgetTabBar`, `LayoutEditToolbar`, and `WorkspaceShell` v2.
