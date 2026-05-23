import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  DestroyRef,
  ElementRef,
  Input,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import type { GridPlacement, WidgetLayoutItem } from '@ncs_software/widget-system';
import {
  gridItems as filterGridItems,
  evaluateGridMove,
  columnWidthPx,
  columnStridePx,
  findOverlappingInstanceIds,
  formatGridMoveRejection,
  layoutConfigForContainerWidth,
  placementFromDragDelta,
  proposedFootprintRect,
  resolveLayoutConfig,
  rowsForContainerHeight,
  toCssGridTemplate,
  type GridContainerMetrics,
} from '@ncs_software/widget-system';
import { WorkspaceLayoutService } from '../../services/workspace-layout.service';
import { GridCellComponent } from './grid-cell.component';
import { GridCellDebugOverlayComponent } from './grid-cell-debug-overlay.component';
import { measureGridCellRects } from './grid-measure';
import { WidgetBodyDirective, type WidgetBodyContext } from '../widget-body.directive';
import { GridResizeHandleDirective } from '../grid-resize-handle/grid-resize-handle.directive';
import { LAYOUT_PERMISSIONS, WORKSPACE_LAYOUT_CONFIG } from '../../tokens';

@Component({
  selector: 'wdg-grid-workspace-layout',
  standalone: true,
  imports: [
    DecimalPipe,
    NgTemplateOutlet,
    DragDropModule,
    GridCellComponent,
    GridCellDebugOverlayComponent,
    GridResizeHandleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wdg-grid-workspace-layout-wrapper" #gridWrapper>
      @if (editMode) {
        <div class="wdg-grid-workspace-layout__debug-bar" aria-hidden="true">
          Viewport {{ containerSize().width | number: '1.0-0' }}×{{
            containerSize().height | number: '1.0-0'
          }}px · {{ gridTemplate()?.columnCount ?? 0 }} cols · track
          {{ columnWidthPx() | number: '1.2-2' }}px · stride
          {{ columnStridePx() | number: '1.2-2' }}px · gap {{ layoutGapPx() }}px
        </div>
      }
      <div
        #gridRoot
        class="wdg-grid-workspace-layout"
        data-testid="grid-workspace"
        [class.wdg-grid-workspace-layout--edit]="editMode"
        [style.display]="'grid'"
        [style.gridTemplateColumns]="gridTemplate()?.gridTemplateColumns"
        [style.gridTemplateRows]="gridTemplate()?.gridTemplateRows"
        [style.gap]="gridTemplate()?.gap"
        [style.width]="'100%'"
        [attr.data-grid-columns]="gridTemplate()?.columnCount"
        [style.--wdg-grid-col-width.px]="columnWidthPx()"
        [style.--wdg-grid-gap.px]="layoutGapPx()"
      >
        @for (item of gridItems(); track item.instanceId) {
          <wdg-grid-cell
            cdkDrag
            [cdkDragDisabled]="!editMode || !permissions.reorder"
            (cdkDragEnded)="onDragEnded($event, item)"
            [instanceId]="item.instanceId"
            [gridColumn]="cellStyle(item.instanceId)?.gridColumn ?? ''"
            [gridRow]="cellStyle(item.instanceId)?.gridRow ?? ''"
            class="wdg-grid-workspace-layout__cell"
            [class.wdg-grid-workspace-layout__cell--edit]="editMode"
          >
            <div *cdkDragPlaceholder class="wdg-grid-workspace-layout__drag-placeholder"></div>
            @if (editMode) {
              <wdg-grid-cell-debug
                [instanceId]="item.instanceId"
                [widgetId]="item.widgetId"
                [savedGrid]="item.grid"
                [displayGrid]="displayGrid(item.instanceId)"
                [gridContainer]="gridRoot"
              />
            }
            @if (bodyTemplate) {
              <ng-container
                *ngTemplateOutlet="
                  bodyTemplate;
                  context: { $implicit: item, item: item }
                "
              />
            } @else {
              <div class="wdg-grid-workspace-layout__placeholder">
                {{ item.widgetId }}
              </div>
            }
            @if (editMode && permissions.resize) {
              <div [wdgGridResizeHandle]="item.instanceId" edge="east"></div>
            }
          </wdg-grid-cell>
        }
      </div>
      @if (layoutFeedback()) {
        <div class="wdg-grid-workspace-layout__feedback" role="status">
          {{ layoutFeedback() }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .wdg-grid-workspace-layout-wrapper {
        position: relative;
        height: 100%;
        width: 100%;
        overflow: auto;
      }

      .wdg-grid-workspace-layout {
        height: auto;
        min-height: 100%;
        width: 100%;
        box-sizing: border-box;
        position: relative;
        align-content: start;
      }

      .wdg-grid-workspace-layout--edit {
        background-image: repeating-linear-gradient(
          90deg,
          transparent 0,
          transparent var(--wdg-grid-col-width),
          rgba(25, 118, 210, 0.07) var(--wdg-grid-col-width),
          rgba(25, 118, 210, 0.07) calc(var(--wdg-grid-col-width) + 1px)
        );
        background-size: calc(var(--wdg-grid-col-width) + var(--wdg-grid-gap)) 100%;
      }

      .wdg-grid-workspace-layout__cell {
        position: relative;
        align-self: start;
        width: 100%;
        height: auto;
      }

      .wdg-grid-workspace-layout__cell--edit {
        outline: 1px dashed rgba(0, 0, 0, 0.2);
        outline-offset: -1px;
        cursor: grab;
      }

      .wdg-grid-workspace-layout__cell--edit.cdk-drag-dragging {
        cursor: grabbing;
        z-index: 3;
      }

      .wdg-grid-workspace-layout__drag-placeholder {
        width: 100%;
        min-height: 80px;
        visibility: hidden;
      }

      .cdk-drag-preview {
        box-sizing: border-box;
        opacity: 0.85;
      }

      .wdg-grid-workspace-layout__placeholder {
        padding: 1rem;
        color: rgba(0, 0, 0, 0.54);
      }

      .wdg-grid-workspace-layout__feedback {
        position: sticky;
        left: 50%;
        bottom: 1rem;
        transform: translateX(-50%);
        width: max-content;
        max-width: min(96vw, 56rem);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        background: rgba(33, 33, 33, 0.92);
        color: #fff;
        font-size: 0.75rem;
        line-height: 1.4;
        white-space: pre-wrap;
        text-align: left;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        pointer-events: none;
        z-index: 4;
      }

      .wdg-grid-workspace-layout__debug-bar {
        position: sticky;
        top: 0;
        z-index: 6;
        padding: 0.35rem 0.65rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.7rem;
        color: #fff;
        background: rgba(25, 118, 210, 0.92);
        pointer-events: none;
      }
    `,
  ],
})
export class GridWorkspaceLayoutComponent implements AfterViewInit {
  private static readonly FEEDBACK_DURATION_MS = 5000;

  @Input() editMode = false;
  @Input() widgetBodyTemplate?: TemplateRef<WidgetBodyContext>;
  @ContentChild(WidgetBodyDirective) widgetBody?: WidgetBodyDirective;
  @ViewChild('gridRoot') gridContainerRef?: ElementRef<HTMLElement>;
  @ViewChild('gridWrapper') gridWrapper?: ElementRef<HTMLElement>;

  protected readonly permissions = inject(LAYOUT_PERMISSIONS);
  private readonly layoutService = inject(WorkspaceLayoutService);
  private readonly layoutDefaults = inject(WORKSPACE_LAYOUT_CONFIG);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly layoutFeedback = signal<string | null>(null);
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly containerSize = signal({ width: 0, height: 0 });
  private resizeObserver?: ResizeObserver;

  private readonly workspace = toSignal(this.layoutService.workspace$, { initialValue: null });

  protected readonly baseLayoutConfig = computed(() => {
    const ws = this.workspace();
    return resolveLayoutConfig({ ...ws?.layout, ...this.layoutDefaults });
  });

  protected readonly activeLayoutConfig = computed(() => {
    const width = this.containerSize().width;
    if (width <= 0) {
      return this.baseLayoutConfig();
    }
    return layoutConfigForContainerWidth(width, this.baseLayoutConfig());
  });

  protected readonly gridItems = computed(() => {
    const ws = this.workspace();
    if (!ws?.items) {
      return [];
    }
    return filterGridItems(ws.items);
  });

  protected readonly gridTemplate = computed(() => {
    const ws = this.workspace();
    if (!ws?.items) {
      return null;
    }
    const layoutConfig = this.activeLayoutConfig();
    const height = this.containerSize().height;
    const minRows =
      this.editMode && height > 0 ? rowsForContainerHeight(height, layoutConfig) : undefined;
    return toCssGridTemplate(ws.items, layoutConfig, {
      minRows,
      columnCount: layoutConfig.columns,
    });
  });

  protected columnWidthPx(): number {
    return columnWidthPx(this.activeLayoutConfig());
  }

  protected layoutGapPx(): number {
    return this.activeLayoutConfig().gapPx;
  }

  protected columnStridePx(): number {
    return columnStridePx(this.activeLayoutConfig());
  }

  protected displayGrid(instanceId: string): GridPlacement {
    const cell = this.gridTemplate()?.items.find(i => i.instanceId === instanceId);
    return cell?.displayGrid ?? { colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 2 };
  }

  ngAfterViewInit(): void {
    const el = this.gridWrapper?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        this.containerSize.set({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    this.resizeObserver.observe(el);
    const rect = el.getBoundingClientRect();
    this.containerSize.set({ width: rect.width, height: rect.height });
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  protected get bodyTemplate(): TemplateRef<WidgetBodyContext> | undefined {
    return this.widgetBodyTemplate ?? this.widgetBody?.templateRef;
  }

  protected cellStyle(instanceId: string): { gridColumn: string; gridRow: string } | null {
    const cell = this.gridTemplate()?.items.find(i => i.instanceId === instanceId);
    return cell ? { gridColumn: cell.gridColumn, gridRow: cell.gridRow } : null;
  }

  protected onDragEnded(event: CdkDragEnd, item: WidgetLayoutItem): void {
    if (!this.editMode || !this.permissions.reorder || !this.gridContainerRef) {
      return;
    }

    const containerEl = this.gridContainerRef.nativeElement;
    const gridRect = containerEl.getBoundingClientRect();
    const viewportRect = this.gridWrapper?.nativeElement.getBoundingClientRect() ?? gridRect;
    const ws = this.workspace();
    const layout = this.activeLayoutConfig();

    const container: GridContainerMetrics = {
      left: gridRect.left,
      top: gridRect.top,
      width: this.containerSize().width > 0 ? this.containerSize().width : gridRect.width,
      height: this.containerSize().height > 0 ? this.containerSize().height : viewportRect.height,
    };

    const placement = placementFromDragDelta(
      item.grid,
      event.distance.x,
      event.distance.y,
      container,
      layout
    );

    const measuredRects = measureGridCellRects(containerEl);

    event.source.reset();

    const rejection = evaluateGridMove(
      ws?.items ?? [],
      item.instanceId,
      placement,
      container.width,
      container.height,
      layout,
      measuredRects
    );
    if (rejection === 'out_of_bounds' || rejection === 'overlap') {
      this.showLayoutFeedback(
        this.buildMoveRejectionMessage(rejection, item, placement, measuredRects, layout)
      );
      return;
    }

    if (!ws?.items) {
      return;
    }

    this.layoutService.moveWidget(item.instanceId, placement).subscribe();
  }

  private buildMoveRejectionMessage(
    rejection: 'out_of_bounds' | 'overlap',
    item: WidgetLayoutItem,
    placement: GridPlacement,
    measuredRects: Map<string, import('@ncs_software/widget-system').PixelRect>,
    layout: ReturnType<typeof resolveLayoutConfig>
  ): string {
    const draggedRect = measuredRects.get(item.instanceId);
    const draggedHeight = draggedRect?.height ?? layout.rowHeightPx;
    const attemptedPixel = proposedFootprintRect(placement, draggedHeight, layout);
    const overlappingIds =
      rejection === 'overlap'
        ? findOverlappingInstanceIds(
            item.instanceId,
            placement,
            draggedHeight,
            measuredRects,
            layout
          )
        : undefined;
    return formatGridMoveRejection(rejection, {
      attempted: placement,
      saved: item.grid,
      overlappingIds,
      attemptedPixel,
    });
  }

  private showLayoutFeedback(message: string): void {
    this.layoutFeedback.set(message);
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => {
      this.layoutFeedback.set(null);
      this.feedbackTimer = null;
    }, GridWorkspaceLayoutComponent.FEEDBACK_DURATION_MS);
  }
}
