import { Directive, TemplateRef } from '@angular/core';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';

export interface WidgetBodyContext {
  $implicit: WidgetLayoutItem;
  item: WidgetLayoutItem;
}

/** Marks an ng-template that renders widget body content for each grid item */
@Directive({ selector: '[wdgWidgetBody]', standalone: true })
export class WidgetBodyDirective {
  constructor(public readonly templateRef: TemplateRef<WidgetBodyContext>) {}
}
