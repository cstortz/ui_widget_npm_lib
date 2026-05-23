import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'demo-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="demo-header">
      <h1>{{ title }}</h1>
      <p>Angular demo — 12-column grid workspace with runtime layout editing</p>
    </header>
    <main class="demo-main">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      .demo-header {
        padding: 0.75rem 1.25rem;
        background: #1976d2;
        color: #fff;
      }

      .demo-header h1 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 500;
      }

      .demo-header p {
        margin: 0.25rem 0 0;
        opacity: 0.9;
        font-size: 0.875rem;
      }

      .demo-main {
        flex: 1;
        min-height: 0;
        padding: 0.75rem;
        box-sizing: border-box;
      }
    `,
  ],
})
export class AppComponent {
  protected readonly title = '@ncs_software/widget-system';
}
