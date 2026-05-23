import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input,
  TemplateRef,
  computed,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import { gridItems as filterGridItems, toCssGridTemplate } from '@ncs_software/widget-system';
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
      class="wdg-grid-workspace-layout"
      cdkDropList
      [cdkDropListDisabled]="!editMode"
      (cdkDropListDropped)="onDrop($event)"
      [style.display]="'grid'"
      [style.gridTemplateColumns]="gridTemplate()?.gridTemplateColumns"
      [style.gridTemplateRows]="gridTemplate()?.gridTemplateRows"
      [style.gap]="gridTemplate()?.gap"
    >
      @for (item of gridItems(); track item.instanceId) {
        <wdg-grid-cell
          cdkDrag
          [cdkDragDisabled]="!editMode || !permissions.reorder"
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
      }

      .wdg-grid-workspace-layout__cell {
        position: relative;
      }

      .wdg-grid-workspace-layout__cell--edit {
        outline: 1px dashed rgba(0, 0, 0, 0.2);
        outline-offset: -1px;
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

  protected get bodyTemplate(): TemplateRef<WidgetBodyContext> | undefined {
    return this.widgetBodyTemplate ?? this.widgetBody?.templateRef;
  }

  protected cellStyle(instanceId: string): { gridColumn: string; gridRow: string } | null {
    const cell = this.gridTemplate()?.items.find(i => i.instanceId === instanceId);
    return cell ? { gridColumn: cell.gridColumn, gridRow: cell.gridRow } : null;
  }

  protected onDrop(event: CdkDragDrop<WidgetLayoutItem[]>): void {
    const items = [...this.gridItems()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    const reordered = items.map((item, index) => ({
      ...item,
      grid: {
        ...item.grid,
        rowStart: index + 1,
        rowEnd: index + 2,
      },
    }));
    const ws = this.workspace();
    const tabbed = (ws?.items ?? []).filter(i => i.mode === 'tabbed');
    this.layoutService.updateItems([...tabbed, ...reordered]).subscribe();
  }
}
