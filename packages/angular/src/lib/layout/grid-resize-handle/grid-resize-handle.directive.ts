import {
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import {
  columnStridePx,
  resolveLayoutConfig,
} from '@ncs_software/widget-system';
import { WorkspaceLayoutService } from '../../services/workspace-layout.service';
import { WORKSPACE_LAYOUT_CONFIG } from '../../tokens';

@Directive({
  selector: '[wdgGridResizeHandle]',
  standalone: true,
})
export class GridResizeHandleDirective {
  @Input({ alias: 'wdgGridResizeHandle', required: true }) instanceId!: string;
  @Input() edge: 'east' | 'west' = 'east';
  @Output() resizeComplete = new EventEmitter<void>();

  @HostBinding('attr.data-edge')
  get dataEdge(): string {
    return this.edge;
  }

  @HostBinding('style.position')
  readonly position = 'absolute';

  @HostBinding('style.top')
  readonly top = '0';

  @HostBinding('style.bottom')
  readonly bottom = '0';

  @HostBinding('style.width')
  readonly width = '8px';

  @HostBinding('style.cursor')
  readonly cursor = 'ew-resize';

  @HostBinding('style.zIndex')
  readonly zIndex = '2';

  @HostBinding('style.right')
  get right(): string | null {
    return this.edge === 'east' ? '-4px' : null;
  }

  @HostBinding('style.left')
  get left(): string | null {
    return this.edge === 'west' ? '-4px' : null;
  }

  private readonly layoutService = inject(WorkspaceLayoutService);
  private readonly layoutDefaults = inject(WORKSPACE_LAYOUT_CONFIG);
  private dragging = false;
  private startX = 0;
  private accumulatedColumns = 0;

  private get columnStride(): number {
    return columnStridePx(resolveLayoutConfig(this.layoutDefaults));
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
    this.startX = event.clientX;
    this.accumulatedColumns = 0;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    const deltaPx = event.clientX - this.startX;
    const columnDelta = Math.round(deltaPx / this.columnStride) - this.accumulatedColumns;
    if (columnDelta !== 0) {
      this.accumulatedColumns += columnDelta;
      this.layoutService
        .resizeWidget(this.instanceId, columnDelta, this.edge)
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
