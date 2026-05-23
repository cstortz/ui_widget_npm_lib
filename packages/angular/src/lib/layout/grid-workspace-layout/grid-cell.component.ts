import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';

@Component({
  selector: 'wdg-grid-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[style.gridColumn]': 'gridColumn',
    '[style.gridRow]': 'gridRow',
    '[attr.data-wdg-instance-id]': 'instanceId',
    class: 'wdg-grid-cell',
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
      }
    `,
  ],
})
export class GridCellComponent {
  @Input({ required: true }) instanceId!: string;
  @Input() gridColumn = '';
  @Input() gridRow = '';
}
