import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'wdg-widget-panel',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="wdg-widget-panel" [class.wdg-widget-panel--collapsed]="collapsed()">
      <mat-card-header class="wdg-widget-panel__header">
        <mat-card-title>{{ title }}</mat-card-title>
        <span class="wdg-widget-panel__spacer"></span>
        <ng-content select="[headerActions]" />
        @if (canCollapse) {
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="collapsed() ? 'Expand panel' : 'Collapse panel'"
            (click)="toggleCollapse()"
          >
            <mat-icon>{{ collapsed() ? 'expand_more' : 'expand_less' }}</mat-icon>
          </button>
        }
      </mat-card-header>

      <mat-card-content
        class="wdg-widget-panel__content"
        [class.wdg-widget-panel__content--hidden]="collapsed()"
      >
        <ng-content />
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .wdg-widget-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }

      .wdg-widget-panel__header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .wdg-widget-panel__spacer {
        flex: 1;
      }

      .wdg-widget-panel__content {
        flex: 1;
        overflow: auto;
        min-height: 0;
      }

      .wdg-widget-panel__content--hidden {
        display: none;
      }

      .wdg-widget-panel--collapsed .wdg-widget-panel__header {
        border-bottom: none;
      }
    `,
  ],
})
export class WidgetPanelComponent implements OnInit {
  @Input({ required: true }) title!: string;
  @Input() canCollapse = true;
  @Input() initialCollapsed = false;
  @Output() collapseChange = new EventEmitter<boolean>();

  protected readonly collapsed = signal(false);

  ngOnInit(): void {
    this.collapsed.set(this.initialCollapsed);
  }

  protected toggleCollapse(): void {
    this.collapsed.update(c => !c);
    this.collapseChange.emit(this.collapsed());
  }
}
