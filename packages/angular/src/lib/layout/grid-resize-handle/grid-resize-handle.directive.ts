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
    '[style.position]': "'absolute'",
    '[style.zIndex]': '10',
    '[style.touchAction]': "'none'",
  },
})
export class GridResizeHandleDirective {
  @Input({ alias: 'wdgGridResizeHandle', required: true }) instanceId!: string;
  @Input() edge: GridResizeEdge = 'east';
  @Input() layoutBounds?: GridLayoutBounds;
  @Output() resizeComplete = new EventEmitter<void>();

  @HostBinding('style.top')
  get styleTop(): string | null {
    if (this.edge === 'north') {
      return '0';
    }
    return this.isHorizontal ? '0' : null;
  }

  @HostBinding('style.bottom')
  get styleBottom(): string | null {
    if (this.edge === 'south') {
      return '0';
    }
    return this.isHorizontal ? '0' : null;
  }

  @HostBinding('style.left')
  get styleLeft(): string | null {
    if (this.edge === 'west') {
      return '0';
    }
    return this.isVertical ? '0' : null;
  }

  @HostBinding('style.right')
  get styleRight(): string | null {
    if (this.edge === 'east') {
      return '0';
    }
    return this.isVertical ? '0' : null;
  }

  @HostBinding('style.width')
  get styleWidth(): string | null {
    return this.isHorizontal ? '12px' : null;
  }

  @HostBinding('style.height')
  get styleHeight(): string | null {
    return this.isVertical ? '12px' : null;
  }

  @HostBinding('style.cursor')
  get styleCursor(): string {
    return this.isVertical ? 'ns-resize' : 'ew-resize';
  }

  private readonly layoutService = inject(WorkspaceLayoutService);
  private readonly layoutDefaults = inject(WORKSPACE_LAYOUT_CONFIG);
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private accumulatedColumns = 0;
  private accumulatedRows = 0;

  private get isVertical(): boolean {
    return this.edge === 'south' || this.edge === 'north';
  }

  private get isHorizontal(): boolean {
    return this.edge === 'east' || this.edge === 'west';
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
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.accumulatedColumns = 0;
    this.accumulatedRows = 0;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    if (this.isVertical) {
      if (this.layoutBounds?.rows === undefined) {
        return;
      }
      const deltaPx = event.clientY - this.startY;
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
    const deltaPx = event.clientX - this.startX;
    const columnDelta = Math.round(deltaPx / this.columnStride) - this.accumulatedColumns;
    if (columnDelta !== 0) {
      this.accumulatedColumns += columnDelta;
      this.layoutService
        .resizeWidget(this.instanceId, columnDelta, this.edge as 'east' | 'west', this.layoutBounds)
        .subscribe();
    }
  }

  @HostListener('pointerup')
  @HostListener('pointercancel')
  onPointerUp(): void {
    if (this.dragging) {
      this.dragging = false;
      this.resizeComplete.emit();
    }
  }
}
