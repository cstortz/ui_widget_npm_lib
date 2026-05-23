import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  inject,
} from '@angular/core';
import type { GridPlacement, PixelRect } from '@ncs_software/widget-system';
import {
  formatGridPlacementSummary,
  formatPixelFootprint,
  placementsDiffer,
} from '@ncs_software/widget-system';

@Component({
  selector: 'wdg-grid-cell-debug',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wdg-grid-cell-debug" data-testid="grid-cell-debug" aria-hidden="true">
      <div class="wdg-grid-cell-debug__title">{{ widgetId }}</div>
      <div class="wdg-grid-cell-debug__line">
        <span class="wdg-grid-cell-debug__label">Saved</span>
        {{ savedSummary }}
      </div>
      <div
        class="wdg-grid-cell-debug__line"
        [class.wdg-grid-cell-debug__line--warn]="displayDiffers"
      >
        <span class="wdg-grid-cell-debug__label">Display</span>
        {{ displaySummary }}
      </div>
      @if (pixelSummary) {
        <div class="wdg-grid-cell-debug__line">
          <span class="wdg-grid-cell-debug__label">Px</span>
          {{ pixelSummary }}
        </div>
      }
      <div class="wdg-grid-cell-debug__meta">{{ instanceId }}</div>
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 5;
        pointer-events: none;
      }

      .wdg-grid-cell-debug {
        padding: 0.35rem 0.45rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.65rem;
        line-height: 1.35;
        color: #fff;
        background: rgba(18, 18, 18, 0.88);
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }

      .wdg-grid-cell-debug__title {
        font-weight: 700;
        margin-bottom: 0.15rem;
      }

      .wdg-grid-cell-debug__line {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .wdg-grid-cell-debug__line--warn {
        color: #ffcc80;
      }

      .wdg-grid-cell-debug__label {
        display: inline-block;
        min-width: 3.25rem;
        color: rgba(255, 255, 255, 0.65);
      }

      .wdg-grid-cell-debug__meta {
        margin-top: 0.15rem;
        color: rgba(255, 255, 255, 0.45);
        font-size: 0.6rem;
      }
    `,
  ],
})
export class GridCellDebugOverlayComponent implements AfterViewInit {
  @Input({ required: true }) instanceId!: string;
  @Input({ required: true }) widgetId!: string;
  @Input({ required: true }) savedGrid!: GridPlacement;
  @Input({ required: true }) displayGrid!: GridPlacement;
  @Input() gridContainer?: HTMLElement;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private resizeObserver?: ResizeObserver;

  protected savedSummary = '';
  protected displaySummary = '';
  protected pixelSummary: string | null = null;
  protected displayDiffers = false;

  ngAfterViewInit(): void {
    this.savedSummary = formatGridPlacementSummary(this.savedGrid);
    this.displaySummary = formatGridPlacementSummary(this.displayGrid);
    this.displayDiffers = placementsDiffer(this.savedGrid, this.displayGrid);

    const cell = this.host.nativeElement.parentElement;
    const container = this.gridContainer;
    if (!cell || !container || typeof ResizeObserver === 'undefined') {
      return;
    }

    const measure = () => {
      const cellBox = cell.getBoundingClientRect();
      const containerBox = container.getBoundingClientRect();
      const rect: PixelRect = {
        left: cellBox.left - containerBox.left,
        top: cellBox.top - containerBox.top,
        width: cellBox.width,
        height: cellBox.height,
      };
      this.pixelSummary = formatPixelFootprint(rect);
      this.cdr.markForCheck();
    };

    this.resizeObserver = new ResizeObserver(measure);
    this.resizeObserver.observe(cell);
    this.resizeObserver.observe(container);
    measure();
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }
}
