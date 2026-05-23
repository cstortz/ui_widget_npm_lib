import { useMemo, useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import {
  gridItems as filterGridItems,
  placementFromDragDelta,
  toCssGridTemplate,
} from '@ncs_software/widget-system';
import {
  useLayoutConfig,
  useWorkspace,
  useWorkspaceLayoutService,
} from '../widget-state-context.js';
import { GridResizeHandle } from './GridResizeHandle.js';
import { measureGridRowMetrics } from './grid-measure.js';
import './GridWorkspaceLayout.css';

export interface GridWorkspaceLayoutProps {
  editMode?: boolean;
  renderWidget: (item: WidgetLayoutItem) => React.ReactNode;
}

function DraggableGridCell({
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.instanceId,
    disabled: !editMode,
  });

  const style: React.CSSProperties = {
    gridColumn,
    gridRow,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 3 : undefined,
    cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-wdg-instance-id={item.instanceId}
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
  const gridRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const gridItems = useMemo(
    () => (workspace?.items ? filterGridItems(workspace.items) : []),
    [workspace]
  );

  const gridTemplate = useMemo(
    () =>
      workspace?.items
        ? toCssGridTemplate(workspace.items, { ...workspace.layout, ...layout })
        : null,
    [workspace, layout]
  );

  const cellStyle = (instanceId: string) => {
    const cell = gridTemplate?.items.find(i => i.instanceId === instanceId);
    return cell
      ? { gridColumn: cell.gridColumn, gridRow: cell.gridRow }
      : { gridColumn: '', gridRow: '' };
  };

  const onDragEnd = async (event: DragEndEvent) => {
    if (!editMode || !permissions.reorder || !gridRef.current || !workspace?.items) {
      return;
    }

    const { active } = event;
    const item = gridItems.find(i => i.instanceId === active.id);
    if (!item) {
      return;
    }

    const container = gridRef.current.getBoundingClientRect();
    const rowMetrics = measureGridRowMetrics(gridRef.current, String(active.id));
    const placement = placementFromDragDelta(
      item.grid,
      event.delta.x,
      event.delta.y,
      container.width,
      { ...workspace.layout, ...layout },
      rowMetrics
    );

    await layoutService.moveWidget(item.instanceId, placement);
  };

  if (!gridTemplate) {
    return null;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div
        ref={gridRef}
        data-testid="grid-workspace"
        className={`wdg-grid-workspace-layout${editMode ? ' wdg-grid-workspace-layout--edit' : ''}`}
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
            <DraggableGridCell
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
    </DndContext>
  );
}
