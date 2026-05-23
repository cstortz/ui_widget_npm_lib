import { useEffect, useState } from 'react';
import type { WidgetLayoutItem } from '@ncs_software/widget-system';

export function DemoTimerWidget({ item }: { item: WidgetLayoutItem }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p style={{ margin: 0, fontSize: '1.25rem' }}>
      Elapsed: <strong>{seconds}s</strong> ({item.instanceId.slice(0, 8)}…)
    </p>
  );
}
