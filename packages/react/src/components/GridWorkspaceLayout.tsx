import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import {
  gridItems as filterGridItems,
  evaluateGridMove,
  columnWidthPx,
  layoutConfigForContainerWidth,
  placementFromDragDelta,
  resolveLayoutConfig,
  rowsForContainerHeight,
  toCssGridTemplate,
  type GridContainerMetrics,
} from '@ncs_software/widget-system';
import {
  useLayoutConfig,
  useWorkspace,
  useWorkspaceLayoutService,
} from '../widget-state-context.js';
import { GridResizeHandle } from './GridResizeHandle.js';
import { measureGridCellRects } from './grid-measure.js';
import './GridWorkspaceLayout.css';

const OVERLAP_MESSAGE = 'That spot is occupied — choose an empty area.';
const OUT_OF_BOUNDS_MESSAGE = 'Keep the widget fully inside the workspace.';

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
  isDragOverlaySource,
}: {
  item: WidgetLayoutItem;
  editMode: boolean;
  canResize: boolean;
  gridColumn: string;
  gridRow: string;
  renderWidget: (item: WidgetLayoutItem) => React.ReactNode;
  isDragOverlaySource?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.instanceId,
    disabled: !editMode,
  });

  const style: React.CSSProperties = {
    gridColumn,
    gridRow,
    cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : undefined,
    visibility: isDragging && !isDragOverlaySource ? 'hidden' : undefined,
  };

  return (
    <div
      ref={isDragOverlaySource ? undefined : setNodeRef}
      style={style}
      data-wdg-instance-id={item.instanceId}
      className={`wdg-grid-workspace-layout__cell${editMode ? ' wdg-grid-workspace-layout__cell--edit' : ''}${isDragging && !isDragOverlaySource ? ' wdg-grid-workspace-layout__cell--dragging' : ''}`}
      {...(editMode && !isDragOverlaySource ? { ...attributes, ...listeners } : {})}
    >
      {renderWidget(item)}
      {editMode && canResize && !isDragOverlaySource && (
        <GridResizeHandle instanceId={item.instanceId} edge="east" />
      )}
    </div>
  );
}

export function GridWorkspaceLayout({ editMode = false, renderWidget }: GridWorkspaceLayoutProps) {
  const workspace = useWorkspace();
  const layoutService = useWorkspaceLayoutService();
  const { layout, permissions } = useLayoutConfig();
  const gridRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layoutFeedback, setLayoutFeedback] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    return () => observer.disconnect();
  }, [workspace?.items]);

  const showLayoutFeedback = (message: string) => {
    setLayoutFeedback(message);
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = setTimeout(() => {
      setLayoutFeedback(null);
      feedbackTimer.current = null;
    }, 3000);
  };

  const gridItems = useMemo(
    () => (workspace?.items ? filterGridItems(workspace.items) : []),
    [workspace]
  );

  const baseLayoutConfig = useMemo(
    () => resolveLayoutConfig({ ...workspace?.layout, ...layout }),
    [workspace, layout]
  );

  const activeLayoutConfig = useMemo(() => {
    if (containerSize.width <= 0) {
      return baseLayoutConfig;
    }
    return layoutConfigForContainerWidth(containerSize.width, baseLayoutConfig);
  }, [baseLayoutConfig, containerSize.width]);

  const gridTemplate = useMemo(() => {
    if (!workspace?.items) {
      return null;
    }
    const minRows =
      editMode && containerSize.height > 0
        ? rowsForContainerHeight(containerSize.height, activeLayoutConfig)
        : undefined;
    return toCssGridTemplate(workspace.items, activeLayoutConfig, {
      minRows,
      columnCount: activeLayoutConfig.columns,
    });
  }, [workspace, activeLayoutConfig, editMode, containerSize.height]);

  const cellStyle = (instanceId: string) => {
    const cell = gridTemplate?.items.find(i => i.instanceId === instanceId);
    return cell
      ? { gridColumn: cell.gridColumn, gridRow: cell.gridRow }
      : { gridColumn: '', gridRow: '' };
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = async (event: DragEndEvent) => {
    if (!editMode || !permissions.reorder || !gridRef.current || !workspace?.items) {
      setActiveId(null);
      return;
    }

    const { active } = event;
    const item = gridItems.find(i => i.instanceId === active.id);
    if (!item) {
      setActiveId(null);
      return;
    }

    const measuredRects = measureGridCellRects(gridRef.current);
    setActiveId(null);

    const gridRect = gridRef.current.getBoundingClientRect();
    const container: GridContainerMetrics = {
      left: gridRect.left,
      top: gridRect.top,
      width: containerSize.width > 0 ? containerSize.width : gridRect.width,
      height: containerSize.height > 0 ? containerSize.height : gridRect.height,
    };
    const placement = placementFromDragDelta(
      item.grid,
      event.delta.x,
      event.delta.y,
      container,
      activeLayoutConfig
    );

    const rejection = evaluateGridMove(
      workspace.items,
      item.instanceId,
      placement,
      container.width,
      container.height,
      activeLayoutConfig,
      measuredRects
    );
    if (rejection === 'out_of_bounds') {
      showLayoutFeedback(OUT_OF_BOUNDS_MESSAGE);
      return;
    }
    if (rejection === 'overlap') {
      showLayoutFeedback(OVERLAP_MESSAGE);
      return;
    }

    await layoutService.moveWidget(item.instanceId, placement);
  };

  const activeItem = activeId ? gridItems.find(i => i.instanceId === activeId) : undefined;

  if (!gridTemplate) {
    return null;
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="wdg-grid-workspace-layout-wrapper" ref={wrapperRef}>
        <div
          ref={gridRef}
          data-testid="grid-workspace"
          data-grid-columns={gridTemplate.columnCount}
          className={`wdg-grid-workspace-layout${editMode ? ' wdg-grid-workspace-layout--edit' : ''}`}
          style={{
            display: 'grid',
            gridTemplateColumns: gridTemplate.gridTemplateColumns,
            gridTemplateRows: gridTemplate.gridTemplateRows,
            gap: gridTemplate.gap,
            width: '100%',
            ['--wdg-grid-col-width' as string]: `${columnWidthPx(activeLayoutConfig)}px`,
            ['--wdg-grid-gap' as string]: `${activeLayoutConfig.gapPx}px`,
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
        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <DraggableGridCell
              item={activeItem}
              editMode
              canResize={false}
              gridColumn=""
              gridRow=""
              renderWidget={renderWidget}
              isDragOverlaySource
            />
          ) : null}
        </DragOverlay>
        {layoutFeedback && (
          <div className="wdg-grid-workspace-layout__feedback" role="status">
            {layoutFeedback}
          </div>
        )}
      </div>
    </DndContext>
  );
}
