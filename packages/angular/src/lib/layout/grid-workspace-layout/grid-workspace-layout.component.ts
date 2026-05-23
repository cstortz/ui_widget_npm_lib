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
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import {
  gridItems as filterGridItems,
  placementFromPointer,
  toCssGridTemplate,
} from '@ncs_software/widget-system';
import { WorkspaceLayoutService } from '../../services/workspace-layout.service';
import { GridCellComponent } from './grid-cell.component';
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
  `,
  styles: [
    `
      .wdg-grid-workspace-layout {
        height: 100%;
        min-height: 320px;
        width: 100%;
        box-sizing: border-box;
        position: relative;
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
    `,
  ],
})
export class GridWorkspaceLayoutComponent {
  @Input() editMode = false;
  @Input() widgetBodyTemplate?: TemplateRef<WidgetBodyContext>;
  @ContentChild(WidgetBodyDirective) widgetBody?: WidgetBodyDirective;
  @ViewChild('gridContainer') gridContainer?: ElementRef<HTMLElement>;

  protected readonly permissions = inject(LAYOUT_PERMISSIONS);
  private readonly layoutService = inject(WorkspaceLayoutService);
  private readonly layoutDefaults = inject(WORKSPACE_LAYOUT_CONFIG);

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

    const pointer = event.event instanceof MouseEvent
      ? event.event
      : (event.event as TouchEvent).changedTouches?.[0];
    if (!pointer) {
      return;
    }

    const ws = this.workspace();
    const layout = { ...ws?.layout, ...this.layoutDefaults };
    const rect = this.gridContainer.nativeElement.getBoundingClientRect();
    const placement = placementFromPointer(
      pointer.clientX,
      pointer.clientY,
      rect,
      item.grid,
      layout
    );

    this.layoutService.moveWidget(item.instanceId, placement).subscribe();
  }
}
