import { useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import { gridItems as filterGridItems, toCssGridTemplate } from '@ncs_software/widget-system';
import {
  useLayoutConfig,
  useWorkspace,
  useWorkspaceLayoutService,
} from '../widget-state-context.js';
import { GridResizeHandle } from './GridResizeHandle.js';
import './GridWorkspaceLayout.css';

export interface GridWorkspaceLayoutProps {
  editMode?: boolean;
  renderWidget: (item: WidgetLayoutItem) => React.ReactNode;
}

function SortableGridCell({
  item,
  editMode,
  canResize,
  gridColumn,
  gridRow,
  renderWidget,
}: {
  item: WidgetLayoutItem;
  editMode: boolean;
  canResize: boolean;
  gridColumn: string;
  gridRow: string;
  renderWidget: (item: WidgetLayoutItem) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.instanceId, disabled: !editMode });

  const style = {
    gridColumn,
    gridRow,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`wdg-grid-workspace-layout__cell${editMode ? ' wdg-grid-workspace-layout__cell--edit' : ''}`}
      {...(editMode ? { ...attributes, ...listeners } : {})}
    >
      {renderWidget(item)}
      {editMode && canResize && <GridResizeHandle instanceId={item.instanceId} edge="east" />}
    </div>
  );
}

export function GridWorkspaceLayout({ editMode = false, renderWidget }: GridWorkspaceLayoutProps) {
  const workspace = useWorkspace();
  const layoutService = useWorkspaceLayoutService();
  const { layout, permissions } = useLayoutConfig();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const gridItems = useMemo(
    () => (workspace?.items ? filterGridItems(workspace.items) : []),
    [workspace]
  );

  const gridTemplate = useMemo(
    () => (workspace?.items ? toCssGridTemplate(workspace.items, { ...workspace.layout, ...layout }) : null),
    [workspace, layout]
  );

  const cellStyle = (instanceId: string) => {
    const cell = gridTemplate?.items.find(i => i.instanceId === instanceId);
    return cell
      ? { gridColumn: cell.gridColumn, gridRow: cell.gridRow }
      : { gridColumn: '', gridRow: '' };
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !workspace?.items) {
      return;
    }
    const items = [...gridItems];
    const oldIndex = items.findIndex(i => i.instanceId === active.id);
    const newIndex = items.findIndex(i => i.instanceId === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const [moved] = items.splice(oldIndex, 1);
    items.splice(newIndex, 0, moved);
    const reordered = items.map((item, index) => ({
      ...item,
      grid: { ...item.grid, rowStart: index + 1, rowEnd: index + 2 },
    }));
    const tabbed = workspace.items.filter(i => i.mode === 'tabbed');
    await layoutService.updateItems([...tabbed, ...reordered]);
  };

  if (!gridTemplate) {
    return null;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={gridItems.map(i => i.instanceId)} strategy={rectSortingStrategy}>
        <div
          className="wdg-grid-workspace-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: gridTemplate.gridTemplateColumns,
            gridTemplateRows: gridTemplate.gridTemplateRows,
            gap: gridTemplate.gap,
          }}
        >
          {gridItems.map(item => {
            const style = cellStyle(item.instanceId);
            return (
              <SortableGridCell
                key={item.instanceId}
                item={item}
                editMode={editMode && !!permissions.reorder}
                canResize={!!permissions.resize}
                gridColumn={style.gridColumn}
                gridRow={style.gridRow}
                renderWidget={renderWidget}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
