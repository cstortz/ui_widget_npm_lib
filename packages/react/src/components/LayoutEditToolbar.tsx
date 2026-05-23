import { useState } from 'react';
import type { WidgetId } from '@ncs_software/widget-system';
import {
  useLayoutConfig,
  useWorkspaceLayoutService,
} from '../widget-state-context.js';
import './LayoutEditToolbar.css';

export interface LayoutEditToolbarProps {
  workspaceId: string;
  onEditModeChange?: (editMode: boolean) => void;
}

export function LayoutEditToolbar({ workspaceId, onEditModeChange }: LayoutEditToolbarProps) {
  const layoutService = useWorkspaceLayoutService();
  const { permissions, defaultItems } = useLayoutConfig();
  const [editMode, setEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleEditMode = () => {
    const next = !editMode;
    setEditMode(next);
    onEditModeChange?.(next);
  };

  const addWidget = async (widgetId: WidgetId) => {
    await layoutService.addWidget(widgetId, workspaceId);
    setMenuOpen(false);
  };

  const resetLayout = async () => {
    if (defaultItems.length > 0) {
      await layoutService.updateItems([...defaultItems]);
    }
  };

  const availableWidgets = layoutService.registeredWidgetIds();

  return (
    <div className="wdg-layout-edit-toolbar">
      {permissions.editLayout && (
        <button type="button" className="wdg-layout-edit-toolbar__btn" onClick={toggleEditMode}>
          {editMode ? 'Done editing' : 'Edit layout'}
        </button>
      )}

      {editMode && permissions.addWidgets && (
        <div className="wdg-layout-edit-toolbar__menu">
          <button
            type="button"
            className="wdg-layout-edit-toolbar__btn"
            onClick={() => setMenuOpen(open => !open)}
          >
            Add widget
          </button>
          {menuOpen && (
            <div className="wdg-layout-edit-toolbar__dropdown">
              {availableWidgets.map(widgetId => (
                <button
                  key={widgetId}
                  type="button"
                  className="wdg-layout-edit-toolbar__menu-item"
                  onClick={() => void addWidget(widgetId)}
                >
                  {layoutService.displayName(widgetId)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <span className="wdg-layout-edit-toolbar__spacer" />

      {editMode && (
        <button type="button" className="wdg-layout-edit-toolbar__btn" onClick={() => void resetLayout()}>
          Reset layout
        </button>
      )}
    </div>
  );
}

export function useLayoutEditMode(): [boolean, (value: boolean) => void] {
  const [editMode, setEditMode] = useState(false);
  return [editMode, setEditMode];
}
