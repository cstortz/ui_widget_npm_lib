/** Shared types for @ncs_software/widget-system */

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
  | 'demo-checklist';

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

export interface WorkspaceConfig {
  id: string;
  userId: string;
  name: string;
  contextType: WorkspaceContextType;
  contextId: string | null;
  panelOrder: PanelOrder;
  widgets: WidgetConfig[];
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
