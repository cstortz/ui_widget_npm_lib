/** Shared types for @ncs_software/widget-system */

import type { WidgetLayoutItem, WorkspaceLayoutConfig } from './layout-types.js';

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

/** Known widget IDs — extend the union as new widgets are created */
export type KnownWidgetId =
  | 'resume-panel'
  | 'application-guide'
  | 'chat'
  | 'skills-panel'
  | 'fit-rankings'
  | 'skill-plans'
  | 'job-sites'
  | 'improvement-tracker'
  | 'demo-notes'
  | 'demo-checklist'
  | 'demo-website';

/** Widget type id — known ids plus custom string ids from consumer apps */
export type WidgetId = KnownWidgetId | (string & {});

export type PanelPosition = 'primary' | 'secondary';
export type PanelOrder = 'primary-left' | 'primary-right';

export interface WidgetMeta {
  widgetId: WidgetId;
  displayName: string;
  description: string;
  minWidthPx: number;
  canCollapse: boolean;
}

export interface WidgetConfig {
  widgetId: WidgetId;
  position: PanelPosition;
  contextId: string | null;
  collapsed: boolean;
}

export interface WidgetState<T = Record<string, unknown>> {
  widgetId: WidgetId;
  contextId: string | null;
  payload: T;
  savedAt: Date;
}

export type WorkspaceContextType = 'job-application' | 'general';

export type WorkspaceLayoutVersion = 1 | 2;

export interface WorkspaceConfig {
  id: string;
  userId: string;
  name: string;
  contextType: WorkspaceContextType;
  contextId: string | null;
  /** 2 = dynamic grid layout; undefined or 1 = legacy two-panel */
  layoutVersion?: WorkspaceLayoutVersion;
  layout?: WorkspaceLayoutConfig;
  items?: WidgetLayoutItem[];
  /** @deprecated v1 two-panel — use items + layoutVersion 2 */
  panelOrder?: PanelOrder;
  /** @deprecated v1 two-panel — use items + layoutVersion 2 */
  widgets?: WidgetConfig[];
  createdAt: Date;
  updatedAt: Date;
}

/** Widget-specific state shapes (extend in consumer apps) */
export interface ResumePanelState {
  selectedResumeVersionId: string | null;
  expandedSections: string[];
  scrollTop: number;
}

export interface ApplicationGuideState {
  activeSection: string | null;
  checkedItems: string[];
  usedAnswerIds: string[];
  expandedSections: string[];
}

export interface HttpWidgetStateAdapterOptions {
  baseUrl: string;
  getAuthToken?: () => string | null | Promise<string | null>;
  fetchFn?: typeof fetch;
}

export interface LocalStorageWidgetStateAdapterOptions {
  storageKeyPrefix?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}
