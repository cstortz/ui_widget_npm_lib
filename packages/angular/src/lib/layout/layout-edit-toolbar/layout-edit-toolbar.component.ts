import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import type { WidgetId } from '@ncs_software/widget-system';
import { WorkspaceLayoutService } from '../../services/workspace-layout.service';
import { DEFAULT_LAYOUT_ITEMS, LAYOUT_PERMISSIONS } from '../../tokens';

@Component({
  selector: 'wdg-layout-edit-toolbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wdg-layout-edit-toolbar">
      @if (permissions.editLayout) {
        <button
          mat-stroked-button
          type="button"
          (click)="toggleEditMode()"
          [attr.aria-pressed]="editMode()"
        >
          <mat-icon>{{ editMode() ? 'check' : 'edit' }}</mat-icon>
          {{ editMode() ? 'Done editing' : 'Edit layout' }}
        </button>
      }

      @if (editMode() && permissions.addWidgets) {
        <button mat-stroked-button type="button" [matMenuTriggerFor]="addMenu">
          <mat-icon>add</mat-icon>
          Add widget
        </button>
        <mat-menu #addMenu="matMenu">
          @for (widgetId of availableWidgets(); track widgetId) {
            <button mat-menu-item type="button" (click)="addWidget(widgetId)">
              {{ displayName(widgetId) }}
            </button>
          }
        </mat-menu>
      }

      <span class="wdg-layout-edit-toolbar__spacer"></span>

      @if (editMode()) {
        <button mat-button type="button" (click)="resetLayout()">
          Reset layout
        </button>
      }
    </div>
  `,
  styles: [
    `
      .wdg-layout-edit-toolbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        background: #fff;
      }

      .wdg-layout-edit-toolbar__spacer {
        flex: 1;
      }
    `,
  ],
})
export class LayoutEditToolbarComponent {
  @Input() workspaceId!: string;
  @Output() editModeChange = new EventEmitter<boolean>();

  protected readonly permissions = inject(LAYOUT_PERMISSIONS);
  private readonly layoutService = inject(WorkspaceLayoutService);
  private readonly defaultItems = inject(DEFAULT_LAYOUT_ITEMS);

  protected readonly editMode = signal(false);

  protected availableWidgets(): WidgetId[] {
    return this.layoutService.registeredWidgetIds();
  }

  protected displayName(widgetId: WidgetId): string {
    return this.layoutService.displayName(widgetId);
  }

  protected toggleEditMode(): void {
    this.editMode.update(v => !v);
    this.editModeChange.emit(this.editMode());
  }

  protected addWidget(widgetId: WidgetId): void {
    this.layoutService.addWidget(widgetId, this.workspaceId).subscribe();
  }

  protected resetLayout(): void {
    const ws = this.layoutService.workspace;
    if (!ws || this.defaultItems.length === 0) {
      return;
    }
    this.layoutService.updateItems([...this.defaultItems]).subscribe();
  }
}
