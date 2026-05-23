import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  Input,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import {
  gridItems as filterGridItems,
  clampPlacement,
  gridPlacementOverlapsOthers,
  placementFromDragDelta,
  resolveLayoutConfig,
  toCssGridTemplate,
} from '@ncs_software/widget-system';
import { WorkspaceLayoutService } from '../../services/workspace-layout.service';
import { GridCellComponent } from './grid-cell.component';
import { measureGridRowMetrics } from './grid-measure';
import { WidgetBodyDirective, type WidgetBodyContext } from '../widget-body.directive';
import { GridResizeHandleDirective } from '../grid-resize-handle/grid-resize-handle.directive';
import { LAYOUT_PERMISSIONS, WORKSPACE_LAYOUT_CONFIG } from '../../tokens';

@Component({
  selector: 'wdg-grid-workspace-layout',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    DragDropModule,
    GridCellComponent,
    GridResizeHandleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #gridContainer
      class="wdg-grid-workspace-layout"
      data-testid="grid-workspace"
      [class.wdg-grid-workspace-layout--edit]="editMode"
      [style.display]="'grid'"
      [style.gridTemplateColumns]="gridTemplate()?.gridTemplateColumns"
      [style.gridTemplateRows]="gridTemplate()?.gridTemplateRows"
      [style.gap]="gridTemplate()?.gap"
      [style.--wdg-grid-columns]="layoutColumns()"
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
  `,
  styles: [
    `
      .wdg-grid-workspace-layout {
        height: 100%;
        min-height: 320px;
        width: 100%;
        box-sizing: border-box;
        position: relative;
        align-content: start;
      }

      .wdg-grid-workspace-layout--edit {
        background-image: repeating-linear-gradient(
          90deg,
          transparent 0,
          transparent calc((100% - 11 * 8px) / 12),
          rgba(25, 118, 210, 0.07) calc((100% - 11 * 8px) / 12),
          rgba(25, 118, 210, 0.07) calc((100% - 11 * 8px) / 12 + 1px)
        );
        background-size: calc((100% - 11 * 8px) / 12 + 8px) 100%;
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

      .cdk-drag-preview {
        box-sizing: border-box;
        opacity: 0.85;
      }

      .wdg-grid-workspace-layout__placeholder {
        padding: 1rem;
        color: rgba(0, 0, 0, 0.54);
      }

      .wdg-grid-workspace-layout__feedback {
        position: absolute;
        left: 50%;
        bottom: 1rem;
        transform: translateX(-50%);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        background: rgba(33, 33, 33, 0.92);
        color: #fff;
        font-size: 0.875rem;
        pointer-events: none;
        z-index: 4;
      }
    `,
  ],
})
export class GridWorkspaceLayoutComponent {
  private static readonly OVERLAP_MESSAGE = 'That spot is occupied — choose an empty area.';

  @Input() editMode = false;
  @Input() widgetBodyTemplate?: TemplateRef<WidgetBodyContext>;
  @ContentChild(WidgetBodyDirective) widgetBody?: WidgetBodyDirective;
  @ViewChild('gridContainer') gridContainer?: ElementRef<HTMLElement>;

  protected readonly permissions = inject(LAYOUT_PERMISSIONS);
  private readonly layoutService = inject(WorkspaceLayoutService);
  private readonly layoutDefaults = inject(WORKSPACE_LAYOUT_CONFIG);

  protected readonly layoutFeedback = signal<string | null>(null);
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly workspace = toSignal(this.layoutService.workspace$, { initialValue: null });

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
    return toCssGridTemplate(ws.items, { ...ws.layout, ...this.layoutDefaults });
  });

  protected layoutColumns(): number {
    return this.gridTemplate() ? 12 : 12;
  }

  protected get bodyTemplate(): TemplateRef<WidgetBodyContext> | undefined {
    return this.widgetBodyTemplate ?? this.widgetBody?.templateRef;
  }

  protected cellStyle(instanceId: string): { gridColumn: string; gridRow: string } | null {
    const cell = this.gridTemplate()?.items.find(i => i.instanceId === instanceId);
    return cell ? { gridColumn: cell.gridColumn, gridRow: cell.gridRow } : null;
  }

  protected onDragEnded(event: CdkDragEnd, item: WidgetLayoutItem): void {
    if (!this.editMode || !this.permissions.reorder || !this.gridContainer) {
      return;
    }

    const containerEl = this.gridContainer.nativeElement;
    const containerRect = containerEl.getBoundingClientRect();
    const ws = this.workspace();
    const layout = resolveLayoutConfig({ ...ws?.layout, ...this.layoutDefaults });
    const rowMetrics = measureGridRowMetrics(containerEl, item.instanceId);

    const placement = clampPlacement(
      placementFromDragDelta(
        item.grid,
        event.distance.x,
        event.distance.y,
        containerRect.width,
        layout,
        rowMetrics
      ),
      layout.columns
    );

    event.source.reset();

    if (!ws?.items || gridPlacementOverlapsOthers(ws.items, item.instanceId, placement)) {
      this.showLayoutFeedback(GridWorkspaceLayoutComponent.OVERLAP_MESSAGE);
      return;
    }

    this.layoutService.moveWidget(item.instanceId, placement).subscribe();
  }

  private showLayoutFeedback(message: string): void {
    this.layoutFeedback.set(message);
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => {
      this.layoutFeedback.set(null);
      this.feedbackTimer = null;
    }, 3000);
  }
}
