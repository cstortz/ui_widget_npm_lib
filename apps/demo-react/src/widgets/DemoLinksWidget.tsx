import type { WidgetLayoutItem } from '@ncs_software/widget-system';

export function DemoLinksWidget({ item: _item }: { item: WidgetLayoutItem }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
      <li>
        <a href="https://github.com/ncs-software/ui_widget_npm_lib" target="_blank" rel="noreferrer">
          Widget system README
        </a>
      </li>
      <li>
        <a href="https://www.npmjs.com/package/@ncs_software/widget-system" target="_blank" rel="noreferrer">
          npm — core
        </a>
      </li>
    </ul>
  );
}
