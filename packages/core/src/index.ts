export type {
  WidgetInstanceId,
  WidgetPlacementMode,
  GridPlacement,
  WidgetLayoutItem,
  WorkspaceTabBarConfig,
  WorkspaceLayoutConfig,
  LayoutPermissions,
  WidgetSystemOptions,
  CssGridItemStyle,
  CssGridTemplate,
} from './layout-types.js';

export { DEFAULT_WORKSPACE_LAYOUT } from './layout-types.js';

export {
  resolveLayoutConfig,
  gridItems,
  tabbedItems,
  maxGridRow,
  toCssGridTemplate,
  clampPlacement,
  snapResize,
  placementsOverlap,
  validateLayout,
  collapseToTab,
  restoreFromTab,
  nextTabOrder,
  findNextGridSlot,
  createLayoutItem,
  placementFromPointer,
  moveItemOnGrid,
  type GridContainerMetrics,
  type LayoutValidationIssue,
} from './layout-engine.js';

export {
  migrateWorkspaceV1ToV2,
  ensureWorkspaceV2,
  defaultLayoutItemsFromWidgets,
  createV2WorkspaceDefaults,
  createDefaultLayoutItem,
} from './migrate-workspace.js';

export { createWidgetInstanceId, isWorkspaceV2 } from './layout-utils.js';

export type {
  WidgetId,
  PanelPosition,
  PanelOrder,
  WidgetMeta,
  WidgetConfig,
  WidgetState,
  WorkspaceContextType,
  WorkspaceLayoutVersion,
  WorkspaceConfig,
  ResumePanelState,
  ApplicationGuideState,
  HttpWidgetStateAdapterOptions,
  LocalStorageWidgetStateAdapterOptions,
} from './types.js';

export type { WidgetStateAdapter } from './adapters/adapter-contract.js';
export {
  stateKey,
  parseWidgetState,
  parseWorkspaceConfig,
  parseWorkspaceList,
} from './adapters/adapter-contract.js';

export { MemoryWidgetStateAdapter } from './adapters/memory-adapter.js';
export { LocalStorageWidgetStateAdapter } from './adapters/local-storage-adapter.js';
export { HttpWidgetStateAdapter } from './adapters/http-adapter.js';

export { WidgetRegistry, defaultWidgetRegistry } from './widget-registry.js';
export {
  WorkspaceState,
  type WorkspaceStateOptions,
  type CreateDefaultWorkspaceInput,
} from './workspace-state.js';
