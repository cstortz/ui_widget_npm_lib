import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import type { WorkspaceConfig } from '@ncs_software/widget-system';
import { WidgetStateService } from '../services/widget-state.service';
import { WorkspaceLayoutComponent } from '../layout/workspace-layout/workspace-layout.component';

@Component({
  selector: 'wdg-workspace-shell',
  standalone: true,
  imports: [WorkspaceLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (workspace(); as ws) {
      <wdg-workspace-layout [workspaceId]="ws.id">
        <div primaryPanel>
          <ng-content select="[primaryPanel]" />
        </div>
        <div secondaryPanel>
          <ng-content select="[secondaryPanel]" />
        </div>
      </wdg-workspace-layout>
    } @else {
      <p class="wdg-workspace-shell__loading">Loading workspace…</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .wdg-workspace-shell__loading {
        padding: 1rem;
        margin: 0;
      }
    `,
  ],
})
export class WorkspaceShellComponent implements OnInit {
  @Input({ required: true }) workspaceId!: string;
  @Input() defaultWorkspace?: Omit<WorkspaceConfig, 'id' | 'createdAt' | 'updatedAt'>;

  protected readonly workspace = signal<WorkspaceConfig | null>(null);

  private readonly widgetStateService = inject(WidgetStateService);

  ngOnInit(): void {
    this.widgetStateService
      .loadOrCreateDefault(this.workspaceId, () => this.buildDefaultWorkspace())
      .subscribe(ws => this.workspace.set(ws));
  }

  private buildDefaultWorkspace(): WorkspaceConfig {
    const now = new Date();
    const defaults = this.defaultWorkspace;

    return {
      id: this.workspaceId,
      userId: defaults?.userId ?? 'demo-user',
      name: defaults?.name ?? 'Demo Workspace',
      contextType: defaults?.contextType ?? 'general',
      contextId: defaults?.contextId ?? null,
      panelOrder: defaults?.panelOrder ?? 'primary-left',
      widgets: defaults?.widgets ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }
}
