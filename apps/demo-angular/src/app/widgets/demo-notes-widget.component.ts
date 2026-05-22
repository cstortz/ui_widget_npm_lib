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
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { WidgetConfig, WidgetMeta, WidgetState } from '@ncs_software/widget-system';
import { WidgetStateService } from '@ncs_software/widget-system-angular';

interface DemoNotesState {
  text: string;
}

@Component({
  selector: 'demo-notes-widget',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline" class="demo-notes__field">
      <mat-label>Notes</mat-label>
      <textarea
        matInput
        rows="12"
        [ngModel]="text()"
        (ngModelChange)="onTextChange($event)"
        placeholder="Type notes — state persists via WidgetStateService"
      ></textarea>
    </mat-form-field>
  `,
  styles: [
    `
      .demo-notes__field {
        width: 100%;
      }
    `,
  ],
})
export class DemoNotesWidgetComponent implements OnInit, OnDestroy {
  static readonly widgetMeta: WidgetMeta = {
    widgetId: 'demo-notes',
    displayName: 'Notes',
    description: 'Simple notes widget for the demo workspace',
    minWidthPx: 320,
    canCollapse: true,
  };

  @Input({ required: true }) config!: WidgetConfig;
  @Output() stateChange = new EventEmitter<WidgetState<DemoNotesState>>();

  protected readonly text = signal('');

  private readonly widgetStateService = inject(WidgetStateService);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.widgetStateService
      .loadState<DemoNotesState>(this.config.widgetId, this.config.contextId)
      .subscribe(saved => {
        this.text.set(saved?.payload.text ?? '');
      });
  }

  ngOnDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }

  protected onTextChange(value: string): void {
    this.text.set(value);
    this.scheduleSave({ text: value });
  }

  private scheduleSave(payload: DemoNotesState): void {
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
