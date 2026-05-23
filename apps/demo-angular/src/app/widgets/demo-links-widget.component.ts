import { Component, Input } from '@angular/core';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';

@Component({
  selector: 'demo-links-widget',
  standalone: true,
  template: `
    <ul class="demo-links">
      @for (link of links; track link.href) {
        <li>
          <a [href]="link.href" target="_blank" rel="noopener">{{ link.label }}</a>
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .demo-links {
        margin: 0;
        padding-left: 1.25rem;
      }
    `,
  ],
})
export class DemoLinksWidgetComponent {
  @Input({ required: true }) item!: WidgetLayoutItem;

  protected readonly links = [
    { label: 'Widget system README', href: 'https://github.com/ncs-software/ui_widget_npm_lib' },
    { label: 'npm — core', href: 'https://www.npmjs.com/package/@ncs_software/widget-system' },
  ];
}
