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
    <mat-card class="wdg-widget-panel" [class.wdg-widget-panel--contracted]="!expanded()">
      <mat-card-header class="wdg-widget-panel__header">
        <mat-card-title>{{ title }}</mat-card-title>
        <span class="wdg-widget-panel__spacer"></span>
        <ng-content select="[headerActions]" />
        @if (canCollapseToTab) {
          <button
            mat-icon-button
            type="button"
            aria-label="Collapse to tab bar"
            (click)="collapseToTab.emit()"
          >
            <mat-icon>tab</mat-icon>
          </button>
        }
        @if (canExpand) {
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="expanded() ? 'Contract panel' : 'Expand panel'"
            (click)="toggleExpanded()"
          >
            <mat-icon>{{ expanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>
        }
      </mat-card-header>

      <mat-card-content
        class="wdg-widget-panel__content"
        [class.wdg-widget-panel__content--hidden]="!expanded()"
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
        flex-shrink: 0;
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

      .wdg-widget-panel--contracted .wdg-widget-panel__header {
        border-bottom: none;
      }
    `,
  ],
})
export class WidgetPanelComponent implements OnInit {
  @Input({ required: true }) title!: string;
  /** @deprecated use initialExpanded */
  @Input() canCollapse = true;
  @Input() canExpand = true;
  @Input() canCollapseToTab = false;
  /** @deprecated use initialExpanded */
  @Input() initialCollapsed = false;
  @Input() initialExpanded = true;
  @Output() expandedChange = new EventEmitter<boolean>();
  /** @deprecated use expandedChange */
  @Output() collapseChange = new EventEmitter<boolean>();
  @Output() collapseToTab = new EventEmitter<void>();

  protected readonly expanded = signal(true);

  ngOnInit(): void {
    const expanded = this.initialCollapsed ? false : this.initialExpanded;
    this.expanded.set(expanded);
  }

  protected toggleExpanded(): void {
    this.expanded.update(v => !v);
    this.expandedChange.emit(this.expanded());
    this.collapseChange.emit(!this.expanded());
  }
}
