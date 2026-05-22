import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { WidgetStateAdapter } from '@ncs_software/widget-system';
import { WidgetStateService } from './widget-state-service.js';

const WidgetStateContext = createContext<WidgetStateService | null>(null);

export interface WidgetStateProviderProps {
  adapter: WidgetStateAdapter;
  children: ReactNode;
}

export function WidgetStateProvider({ adapter, children }: WidgetStateProviderProps) {
  const service = useMemo(() => new WidgetStateService(adapter), [adapter]);
  return (
    <WidgetStateContext.Provider value={service}>{children}</WidgetStateContext.Provider>
  );
}

export function useWidgetStateService(): WidgetStateService {
  const service = useContext(WidgetStateContext);
  if (!service) {
    throw new Error('useWidgetStateService must be used within WidgetStateProvider');
  }
  return service;
}
