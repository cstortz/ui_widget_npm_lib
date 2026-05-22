import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { WidgetConfig, WidgetMeta, WidgetState } from '@ncs_software/widget-system';
import { WidgetStateService } from '@ncs_software/widget-system-angular';

interface DemoChecklistState {
  checkedIds: string[];
}

const ITEMS = [
  { id: 'review-job', label: 'Review job description' },
  { id: 'update-resume', label: 'Update resume bullets' },
  { id: 'submit-app', label: 'Submit application' },
];

@Component({
  selector: 'demo-checklist-widget',
  standalone: true,
  imports: [MatCheckboxModule],
  template: `
    <ul class="demo-checklist">
      @for (item of items; track item.id) {
        <li>
          <mat-checkbox
            [checked]="isChecked(item.id)"
            (change)="toggle(item.id, $event.checked)"
          >
            {{ item.label }}
          </mat-checkbox>
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .demo-checklist {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .demo-checklist li {
        margin-bottom: 0.5rem;
      }
    `,
  ],
})
export class DemoChecklistWidgetComponent implements OnInit, OnDestroy {
  static readonly widgetMeta: WidgetMeta = {
    widgetId: 'demo-checklist',
    displayName: 'Checklist',
    description: 'Application checklist demo widget',
    minWidthPx: 320,
    canCollapse: true,
  };

  @Input({ required: true }) config!: WidgetConfig;
  @Output() stateChange = new EventEmitter<WidgetState<DemoChecklistState>>();

  protected readonly items = ITEMS;
  protected readonly checkedIds = signal<string[]>([]);

  private readonly widgetStateService = inject(WidgetStateService);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.widgetStateService
      .loadState<DemoChecklistState>(this.config.widgetId, this.config.contextId)
      .subscribe(saved => {
        this.checkedIds.set(saved?.payload.checkedIds ?? []);
      });
  }

  ngOnDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }

  protected isChecked(id: string): boolean {
    return this.checkedIds().includes(id);
  }

  protected toggle(id: string, checked: boolean): void {
    this.checkedIds.update(ids => {
      if (checked) {
        return ids.includes(id) ? ids : [...ids, id];
      }
      return ids.filter(x => x !== id);
    });
    this.scheduleSave({ checkedIds: this.checkedIds() });
  }

  private scheduleSave(payload: DemoChecklistState): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.widgetStateService
        .saveState(this.config.widgetId, this.config.contextId, payload)
        .subscribe(saved => this.stateChange.emit(saved));
    }, 2000);
  }
}
