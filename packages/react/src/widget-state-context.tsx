import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  LayoutPermissions,
  WidgetLayoutItem,
  WidgetStateAdapter,
  WidgetRegistry,
  WorkspaceConfig,
  WorkspaceLayoutConfig,
} from '@ncs_software/widget-system';
import {
  defaultWidgetRegistry,
  DEFAULT_WORKSPACE_LAYOUT,
} from '@ncs_software/widget-system';
import { WidgetStateService } from './widget-state-service.js';
import { WorkspaceLayoutService } from './workspace-layout-service.js';

export interface WidgetSystemConfig {
  adapter: WidgetStateAdapter;
  registry?: WidgetRegistry;
  layout?: Partial<WorkspaceLayoutConfig>;
  permissions?: LayoutPermissions;
  defaultItems?: WidgetLayoutItem[];
}

const WidgetStateContext = createContext<WidgetStateService | null>(null);
const LayoutServiceContext = createContext<WorkspaceLayoutService | null>(null);
const LayoutConfigContext = createContext<{
  layout: Partial<WorkspaceLayoutConfig>;
  permissions: LayoutPermissions;
  defaultItems: WidgetLayoutItem[];
} | null>(null);

export interface WidgetStateProviderProps extends WidgetSystemConfig {
  children: ReactNode;
}

const defaultPermissions: LayoutPermissions = {
  editLayout: true,
  addWidgets: true,
  removeWidgets: true,
  resize: true,
  reorder: true,
};

export function WidgetStateProvider({
  adapter,
  registry = defaultWidgetRegistry,
  layout = {},
  permissions = defaultPermissions,
  defaultItems = [],
  children,
}: WidgetStateProviderProps) {
  const widgetStateService = useMemo(() => new WidgetStateService(adapter), [adapter]);
  const layoutService = useMemo(
    () => new WorkspaceLayoutService(adapter, registry),
    [adapter, registry]
  );
  const layoutConfig = useMemo(
    () => ({
      layout: { ...DEFAULT_WORKSPACE_LAYOUT, ...layout },
      permissions: { ...defaultPermissions, ...permissions },
      defaultItems,
    }),
    [layout, permissions, defaultItems]
  );

  return (
    <WidgetStateContext.Provider value={widgetStateService}>
      <LayoutServiceContext.Provider value={layoutService}>
        <LayoutConfigContext.Provider value={layoutConfig}>
          {children}
        </LayoutConfigContext.Provider>
      </LayoutServiceContext.Provider>
    </WidgetStateContext.Provider>
  );
}

export function useWidgetStateService(): WidgetStateService {
  const service = useContext(WidgetStateContext);
  if (!service) {
    throw new Error('useWidgetStateService must be used within WidgetStateProvider');
  }
  return service;
}

export function useWorkspaceLayoutService(): WorkspaceLayoutService {
  const service = useContext(LayoutServiceContext);
  if (!service) {
    throw new Error('useWorkspaceLayoutService must be used within WidgetStateProvider');
  }
  return service;
}

export function useLayoutConfig(): {
  layout: Partial<WorkspaceLayoutConfig>;
  permissions: LayoutPermissions;
  defaultItems: WidgetLayoutItem[];
} {
  const config = useContext(LayoutConfigContext);
  if (!config) {
    throw new Error('useLayoutConfig must be used within WidgetStateProvider');
  }
  return config;
}

export function useWorkspace(): WorkspaceConfig | null {
  const layoutService = useWorkspaceLayoutService();
  const [workspace, setWorkspace] = useState<WorkspaceConfig | null>(
    layoutService.workspace
  );

  useEffect(() => {
    setWorkspace(layoutService.workspace);
    return layoutService.subscribe(setWorkspace);
  }, [layoutService]);

  return workspace;
}
