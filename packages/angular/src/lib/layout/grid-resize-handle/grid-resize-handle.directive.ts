import {
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import type { GridLayoutBounds } from '@ncs_software/widget-system';
import {
  columnStridePx,
  gridRowStride,
  resolveLayoutConfig,
} from '@ncs_software/widget-system';
import { WorkspaceLayoutService } from '../../services/workspace-layout.service';
import { WORKSPACE_LAYOUT_CONFIG } from '../../tokens';

export type GridResizeEdge = 'east' | 'west' | 'south' | 'north';

@Directive({
  selector: '[wdgGridResizeHandle]',
  standalone: true,
  host: {
    class: 'wdg-grid-resize-handle',
    '[attr.data-edge]': 'edge',
    '[style.touchAction]': "'none'",
  },
})
export class GridResizeHandleDirective {
  @Input({ alias: 'wdgGridResizeHandle', required: true }) instanceId!: string;
  @Input() edge: GridResizeEdge = 'east';
  @Input() layoutBounds?: GridLayoutBounds;
  @Output() resizeComplete = new EventEmitter<void>();

  @HostBinding('class.wdg-grid-resize-handle--bar')
  get isBarLayout(): boolean {
    return this.edge === 'south' || this.edge === 'north';
  }

  @HostBinding('attr.aria-label')
  get ariaLabel(): string {
    return this.isVertical ? 'Resize height' : 'Resize width';
  }

  @HostBinding('textContent')
  get iconText(): string {
    return this.isVertical ? '↕' : '↔';
  }

  private readonly layoutService = inject(WorkspaceLayoutService);
  private readonly layoutDefaults = inject(WORKSPACE_LAYOUT_CONFIG);
  private dragging = false;
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private accumulatedColumns = 0;
  private accumulatedRows = 0;
  private moveListener: ((event: PointerEvent) => void) | null = null;
  private upListener: ((event: PointerEvent) => void) | null = null;

  private get isVertical(): boolean {
    return this.edge === 'south' || this.edge === 'north';
  }

  private get columnStride(): number {
    return columnStridePx(resolveLayoutConfig(this.layoutDefaults));
  }

  private get rowStride(): number {
    return gridRowStride(resolveLayoutConfig(this.layoutDefaults));
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.accumulatedColumns = 0;
    this.accumulatedRows = 0;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);

    this.moveListener = (moveEvent: PointerEvent) => {
      if (!this.dragging || moveEvent.pointerId !== this.pointerId) {
        return;
      }
      if (this.isVertical) {
        if (this.layoutBounds?.rows === undefined) {
          return;
        }
        const deltaPx = moveEvent.clientY - this.startY;
        const rowDelta = Math.round(deltaPx / this.rowStride) - this.accumulatedRows;
        if (rowDelta !== 0) {
          this.accumulatedRows += rowDelta;
          this.layoutService
            .resizeWidgetRows(
              this.instanceId,
              rowDelta,
              this.edge as 'south' | 'north',
              this.layoutBounds
            )
            .subscribe();
        }
        return;
      }
      const deltaPx = moveEvent.clientX - this.startX;
      const columnDelta = Math.round(deltaPx / this.columnStride) - this.accumulatedColumns;
      if (columnDelta !== 0) {
        this.accumulatedColumns += columnDelta;
        this.layoutService
          .resizeWidget(
            this.instanceId,
            columnDelta,
            this.edge as 'east' | 'west',
            this.layoutBounds
          )
          .subscribe();
      }
    };

    this.upListener = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== this.pointerId) {
        return;
      }
      this.detachDocumentListeners();
      this.endDrag(upEvent.target as HTMLElement | null);
    };

    document.addEventListener('pointermove', this.moveListener);
    document.addEventListener('pointerup', this.upListener);
    document.addEventListener('pointercancel', this.upListener);
  }

  private detachDocumentListeners(): void {
    if (this.moveListener) {
      document.removeEventListener('pointermove', this.moveListener);
      this.moveListener = null;
    }
    if (this.upListener) {
      document.removeEventListener('pointerup', this.upListener);
      document.removeEventListener('pointercancel', this.upListener);
      this.upListener = null;
    }
  }

  private endDrag(target: HTMLElement | null): void {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    if (target && this.pointerId !== null && target.hasPointerCapture(this.pointerId)) {
      target.releasePointerCapture(this.pointerId);
    }
    this.pointerId = null;
    this.resizeComplete.emit();
  }
}
