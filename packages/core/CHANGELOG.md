# @ncs_software/widget-system

## 2.0.0

### Major Changes

- c1d86d6: Dynamic grid layout (v2 workspace schema), LayoutEngine, runtime edit mode with tab bar collapse, resize, and drag reorder. Angular and React packages updated for 3.0.0 via linked release.

## 1.1.0

### Minor Changes

- 9abf75e: Implement the Angular widget system library (layout components, WidgetStateService, workspace shell) and replace the demo-angular placeholder with a two-panel workspace demo using Notes and Checklist widgets.

## 1.0.0

### Minor Changes

- e13c2c3: Implement core library: adapters, widget registry, and workspace state machine.

  - MemoryWidgetStateAdapter, LocalStorageWidgetStateAdapter, HttpWidgetStateAdapter
  - WidgetRegistry for registering widget types by ID
  - WorkspaceState layout state machine (panel swap, collapse, persistence)
  - Unit tests for all core components

### Patch Changes

- c1ccc6a: Initial monorepo scaffold with core types, DevOps pipeline, and demo app placeholders.
