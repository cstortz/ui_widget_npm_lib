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
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { WidgetConfig, WidgetState } from '@ncs_software/widget-system';
import { WidgetStateService } from '@ncs_software/widget-system-angular';
import { defaultWebsiteUrl, sanitizeWebsiteUrl } from './website-url';

interface DemoWebsiteState {
  url: string;
}

@Component({
  selector: 'demo-website-widget',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="demo-website">
      <form class="demo-website__toolbar" (submit)="onSubmit($event)">
        <mat-form-field appearance="outline" class="demo-website__field">
          <mat-label>URL</mat-label>
          <input
            matInput
            type="url"
            [ngModel]="urlInput()"
            (ngModelChange)="onUrlInputChange($event)"
            (blur)="applyUrl(urlInput())"
            placeholder="https://example.com"
            name="websiteUrl"
          />
        </mat-form-field>
        <button mat-stroked-button type="submit">Load</button>
      </form>
      <iframe
        class="demo-website__frame"
        title="Embedded website"
        [src]="frameUrl()"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerpolicy="no-referrer"
      ></iframe>
    </div>
  `,
  styles: [
    `
      .demo-website {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 100%;
        min-height: 0;
      }

      .demo-website__toolbar {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        flex-shrink: 0;
      }

      .demo-website__field {
        flex: 1 1 auto;
        min-width: 0;
      }

      .demo-website__frame {
        flex: 1 1 auto;
        width: 100%;
        min-height: 12rem;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 4px;
        background: #fff;
      }
    `,
  ],
})
export class DemoWebsiteWidgetComponent implements OnInit, OnDestroy {
  @Input({ required: true }) config!: WidgetConfig;
  @Output() stateChange = new EventEmitter<WidgetState<DemoWebsiteState>>();

  protected readonly urlInput = signal(defaultWebsiteUrl());
  protected readonly frameUrl = signal(defaultWebsiteUrl());

  private readonly widgetStateService = inject(WidgetStateService);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.widgetStateService
      .loadState<DemoWebsiteState>(this.config.widgetId, this.config.contextId)
      .subscribe(saved => {
        const url = sanitizeWebsiteUrl(saved?.payload.url ?? defaultWebsiteUrl());
        this.urlInput.set(url);
        this.frameUrl.set(url);
      });
  }

  ngOnDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }

  protected onUrlInputChange(value: string): void {
    this.urlInput.set(value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.applyUrl(this.urlInput());
  }

  protected applyUrl(raw: string): void {
    const safeUrl = sanitizeWebsiteUrl(raw);
    this.urlInput.set(safeUrl);
    this.frameUrl.set(safeUrl);
    this.scheduleSave({ url: safeUrl });
  }

  private scheduleSave(payload: DemoWebsiteState): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.widgetStateService
        .saveState(this.config.widgetId, this.config.contextId, payload)
        .subscribe(saved => this.stateChange.emit(saved));
    }, 500);
  }
}
