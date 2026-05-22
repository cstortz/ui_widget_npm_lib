import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import type { PanelOrder } from '@ncs_software/widget-system';
import { EMPTY, switchMap } from 'rxjs';
import { WidgetStateService } from '../../services/widget-state.service';
import { SwapButtonComponent } from '../swap-button/swap-button.component';

@Component({
  selector: 'wdg-workspace-layout',
  standalone: true,
  imports: [SwapButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wdg-workspace-layout" [class.wdg-workspace-layout--swapped]="panelOrder() === 'primary-right'">
      <div class="wdg-workspace-panel wdg-workspace-panel--primary">
        <ng-content select="[primaryPanel]" />
      </div>

      <div class="wdg-workspace-swap-column">
        <wdg-swap-button (swap)="onSwap()" />
      </div>

      <div class="wdg-workspace-panel wdg-workspace-panel--secondary">
        <ng-content select="[secondaryPanel]" />
      </div>
    </div>
  `,
  styles: [
    `
      .wdg-workspace-layout {
        display: grid;
        grid-template-columns: 1fr 48px 1fr;
        grid-template-areas: 'primary swap secondary';
        height: 100%;
        min-height: 320px;
        overflow: hidden;
      }

      .wdg-workspace-layout--swapped {
        grid-template-areas: 'secondary swap primary';
      }

      .wdg-workspace-panel {
        overflow-y: auto;
        height: 100%;
        min-width: 320px;
      }

      .wdg-workspace-panel--primary {
        grid-area: primary;
      }

      .wdg-workspace-panel--secondary {
        grid-area: secondary;
      }

      .wdg-workspace-swap-column {
        grid-area: swap;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      @media (max-width: 768px) {
        .wdg-workspace-layout {
          grid-template-columns: 1fr;
          grid-template-rows: auto 48px auto;
          grid-template-areas:
            'primary'
            'swap'
            'secondary';
        }

        .wdg-workspace-layout--swapped {
          grid-template-areas:
            'secondary'
            'swap'
            'primary';
        }
      }
    `,
  ],
})
export class WorkspaceLayoutComponent implements OnInit {
  @Input({ required: true }) workspaceId!: string;

  protected readonly panelOrder = signal<PanelOrder>('primary-left');

  private readonly widgetStateService = inject(WidgetStateService);

  ngOnInit(): void {
    this.widgetStateService.loadWorkspace(this.workspaceId).subscribe(ws => {
      if (ws) {
        this.panelOrder.set(ws.panelOrder);
      }
    });
  }

  protected onSwap(): void {
    const next: PanelOrder =
      this.panelOrder() === 'primary-left' ? 'primary-right' : 'primary-left';
    this.panelOrder.set(next);

    this.widgetStateService
      .loadWorkspace(this.workspaceId)
      .pipe(
        switchMap(ws => {
          if (!ws) {
            return EMPTY;
          }
          return this.widgetStateService.saveWorkspace({ ...ws, panelOrder: next });
        })
      )
      .subscribe();
  }
}
