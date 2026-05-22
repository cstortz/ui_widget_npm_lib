import { useEffect, useRef, useState } from 'react';
import type { WidgetConfig, WidgetMeta, WidgetState } from '@ncs_software/widget-system';
import { useWidgetStateService } from '@ncs_software/widget-system-react';

interface DemoChecklistState {
  checkedIds: string[];
}

const ITEMS = [
  { id: 'review-job', label: 'Review job description' },
  { id: 'update-resume', label: 'Update resume bullets' },
  { id: 'submit-app', label: 'Submit application' },
];

export const demoChecklistWidgetMeta: WidgetMeta = {
  widgetId: 'demo-checklist',
  displayName: 'Checklist',
  description: 'Application checklist demo widget',
  minWidthPx: 320,
  canCollapse: true,
};

export interface DemoChecklistWidgetProps {
  config: WidgetConfig;
  onStateChange?: (state: WidgetState<DemoChecklistState>) => void;
}

export function DemoChecklistWidget({ config, onStateChange }: DemoChecklistWidgetProps) {
  const widgetStateService = useWidgetStateService();
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    widgetStateService
      .loadState<DemoChecklistState>(config.widgetId, config.contextId)
      .then(saved => {
        if (!cancelled) {
          setCheckedIds(saved?.payload.checkedIds ?? []);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config.widgetId, config.contextId, widgetStateService]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  const scheduleSave = (payload: DemoChecklistState) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      widgetStateService
        .saveState(config.widgetId, config.contextId, payload)
        .then(saved => onStateChange?.(saved));
    }, 2000);
  };

  const toggle = (id: string, checked: boolean) => {
    setCheckedIds(prev => {
      const next = checked
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter(x => x !== id);
      scheduleSave({ checkedIds: next });
      return next;
    });
  };

  return (
    <ul className="demo-checklist">
      {ITEMS.map(item => (
        <li key={item.id}>
          <label className="demo-checklist__item">
            <input
              type="checkbox"
              checked={checkedIds.includes(item.id)}
              onChange={e => toggle(item.id, e.target.checked)}
            />
            {item.label}
          </label>
        </li>
      ))}
    </ul>
  );
}
