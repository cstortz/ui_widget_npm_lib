import { Component, Input } from '@angular/core';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';

@Component({
  selector: 'demo-timer-widget',
  standalone: true,
  template: `
    <p class="demo-timer">
      Elapsed: <strong>{{ seconds }}s</strong>
    </p>
  `,
  styles: [
    `
      .demo-timer {
        margin: 0;
        font-size: 1.25rem;
      }
    `,
  ],
})
export class DemoTimerWidgetComponent {
  @Input({ required: true }) item!: WidgetLayoutItem;
  protected seconds = 0;

  constructor() {
    setInterval(() => {
      this.seconds += 1;
    }, 1000);
  }
}
