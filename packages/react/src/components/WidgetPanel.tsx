import { useState, type ReactNode } from 'react';
import './WidgetPanel.css';

export interface WidgetPanelProps {
  title: string;
  canCollapse?: boolean;
  initialCollapsed?: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function WidgetPanel({
  title,
  canCollapse = true,
  initialCollapsed = false,
  headerActions,
  children,
  onCollapseChange,
}: WidgetPanelProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapseChange?.(next);
  };

  return (
    <section
      className={`wdg-widget-panel${collapsed ? ' wdg-widget-panel--collapsed' : ''}`}
    >
      <header className="wdg-widget-panel__header">
        <h2 className="wdg-widget-panel__title">{title}</h2>
        <span className="wdg-widget-panel__spacer" />
        {headerActions}
        {canCollapse && (
          <button
            type="button"
            className="wdg-widget-panel__collapse"
            aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
            onClick={toggleCollapse}
          >
            {collapsed ? '▾' : '▴'}
          </button>
        )}
      </header>
      {!collapsed && <div className="wdg-widget-panel__content">{children}</div>}
    </section>
  );
}
