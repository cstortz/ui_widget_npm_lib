import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { tabbedItems } from '@ncs_software/widget-system';
import { WorkspaceLayoutService } from '../../services/workspace-layout.service';

@Component({
  selector: 'wdg-widget-tab-bar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tabItems().length > 0) {
      <nav class="wdg-widget-tab-bar" aria-label="Collapsed widgets">
        @for (item of tabItems(); track item.instanceId) {
          <button
            mat-stroked-button
            type="button"
            class="wdg-widget-tab-bar__tab"
            (click)="restore(item.instanceId)"
          >
            <mat-icon>tab</mat-icon>
            {{ displayName(item.widgetId) }}
          </button>
        }
      </nav>
    }
  `,
  styles: [
    `
      .wdg-widget-tab-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.5rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        background: #fafafa;
      }

      .wdg-widget-tab-bar__tab {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
    `,
  ],
})
export class WidgetTabBarComponent {
  private readonly layoutService = inject(WorkspaceLayoutService);
  private readonly workspace = toSignal(this.layoutService.workspace$, { initialValue: null });

  protected readonly tabItems = computed(() => {
    const ws = this.workspace();
    if (!ws?.items) {
      return [];
    }
    return tabbedItems(ws.items);
  });

  protected displayName(widgetId: string): string {
    return this.layoutService.displayName(widgetId);
  }

  protected restore(instanceId: string): void {
    this.layoutService.restoreFromTab(instanceId).subscribe();
  }
}
