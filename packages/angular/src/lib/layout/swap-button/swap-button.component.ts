import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Output,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'wdg-swap-button',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      class="wdg-swap-button"
      type="button"
      aria-label="Swap panel positions"
      matTooltip="Swap panels"
      (click)="swap.emit()"
    >
      <mat-icon>{{ icon() }}</mat-icon>
    </button>
  `,
  styles: [
    `
      .wdg-swap-button {
        color: var(--wdg-swap-color, rgba(0, 0, 0, 0.54));
      }
    `,
  ],
})
export class SwapButtonComponent {
  @Output() swap = new EventEmitter<void>();

  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly icon = toSignal(
    this.breakpointObserver.observe('(max-width: 767.98px)').pipe(
      map(result => (result.matches ? 'swap_vert' : 'swap_horiz'))
    ),
    { initialValue: 'swap_horiz' }
  );
}
