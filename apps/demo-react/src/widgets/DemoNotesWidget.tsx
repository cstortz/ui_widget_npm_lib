import { useEffect, useRef, useState } from 'react';
import type { WidgetConfig, WidgetMeta, WidgetState } from '@ncs_software/widget-system';
import { useWidgetStateService } from '@ncs_software/widget-system-react';

interface DemoNotesState {
  text: string;
}

export const demoNotesWidgetMeta: WidgetMeta = {
  widgetId: 'demo-notes',
  displayName: 'Notes',
  description: 'Simple notes widget for the demo workspace',
  minWidthPx: 320,
  canCollapse: true,
};

export interface DemoNotesWidgetProps {
  config: WidgetConfig;
  onStateChange?: (state: WidgetState<DemoNotesState>) => void;
}

export function DemoNotesWidget({ config, onStateChange }: DemoNotesWidgetProps) {
  const widgetStateService = useWidgetStateService();
  const [text, setText] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    widgetStateService
      .loadState<DemoNotesState>(config.widgetId, config.contextId)
      .then(saved => {
        if (!cancelled) {
          setText(saved?.payload.text ?? '');
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

  const scheduleSave = (payload: DemoNotesState) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      widgetStateService
        .saveState(config.widgetId, config.contextId, payload)
        .then(saved => onStateChange?.(saved));
    }, 2000);
  };

  return (
    <label className="demo-notes">
      <span className="demo-notes__label">Notes</span>
      <textarea
        className="demo-notes__field"
        rows={12}
        value={text}
        onChange={e => {
          const value = e.target.value;
          setText(value);
          scheduleSave({ text: value });
        }}
        placeholder="Type notes — state persists via WidgetStateService"
      />
    </label>
  );
}
