import { useState, type ReactNode } from 'react';
import './WidgetPanel.css';

export interface WidgetPanelProps {
  title: string;
  /** @deprecated use canExpand */
  canCollapse?: boolean;
  canExpand?: boolean;
  canCollapseToTab?: boolean;
  /** @deprecated use initialExpanded */
  initialCollapsed?: boolean;
  initialExpanded?: boolean;
  /** Controlled expanded state */
  expanded?: boolean;
  /** @deprecated use expanded */
  collapsed?: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  /** @deprecated use onExpandedChange */
  onCollapseChange?: (collapsed: boolean) => void;
  onCollapseToTab?: () => void;
}

export function WidgetPanel({
  title,
  canCollapse = true,
  canExpand,
  canCollapseToTab = false,
  initialCollapsed = false,
  initialExpanded = true,
  expanded: controlledExpanded,
  collapsed: controlledCollapsed,
  headerActions,
  children,
  onExpandedChange,
  onCollapseChange,
  onCollapseToTab,
}: WidgetPanelProps) {
  const allowExpand = canExpand ?? canCollapse;
  const initial = initialCollapsed ? false : initialExpanded;
  const [internalExpanded, setInternalExpanded] = useState(initial);

  const expanded =
    controlledExpanded ??
    (controlledCollapsed !== undefined ? !controlledCollapsed : internalExpanded);

  const toggleExpanded = () => {
    const next = !expanded;
    if (controlledExpanded === undefined && controlledCollapsed === undefined) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
    onCollapseChange?.(!next);
  };

  return (
    <section
      className={`wdg-widget-panel${expanded ? '' : ' wdg-widget-panel--contracted'}`}
    >
      <header className="wdg-widget-panel__header">
        <h2 className="wdg-widget-panel__title">{title}</h2>
        <span className="wdg-widget-panel__spacer" />
        {headerActions}
        {canCollapseToTab && (
          <button
            type="button"
            className="wdg-widget-panel__collapse"
            aria-label="Collapse to tab bar"
            onClick={() => onCollapseToTab?.()}
          >
            Tab
          </button>
        )}
        {allowExpand && (
          <button
            type="button"
            className="wdg-widget-panel__collapse"
            aria-label={expanded ? 'Contract panel' : 'Expand panel'}
            onClick={toggleExpanded}
          >
            {expanded ? '▴' : '▾'}
          </button>
        )}
      </header>
      {expanded && <div className="wdg-widget-panel__content">{children}</div>}
    </section>
  );
}
