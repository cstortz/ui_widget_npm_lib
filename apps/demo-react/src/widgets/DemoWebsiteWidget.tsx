import { useEffect, useRef, useState } from 'react';
import type { WidgetConfig, WidgetState } from '@ncs_software/widget-system';
import { useWidgetStateService } from '@ncs_software/widget-system-react';
import { defaultWebsiteUrl, sanitizeWebsiteUrl } from './website-url.js';

interface DemoWebsiteState {
  url: string;
}

export interface DemoWebsiteWidgetProps {
  config: WidgetConfig;
  onStateChange?: (state: WidgetState<DemoWebsiteState>) => void;
}

export function DemoWebsiteWidget({ config, onStateChange }: DemoWebsiteWidgetProps) {
  const widgetStateService = useWidgetStateService();
  const [urlInput, setUrlInput] = useState(defaultWebsiteUrl());
  const [frameUrl, setFrameUrl] = useState(defaultWebsiteUrl());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    widgetStateService
      .loadState<DemoWebsiteState>(config.widgetId, config.contextId)
      .then(saved => {
        if (cancelled) {
          return;
        }
        const url = sanitizeWebsiteUrl(saved?.payload.url ?? defaultWebsiteUrl());
        setUrlInput(url);
        setFrameUrl(url);
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

  const applyUrl = (raw: string) => {
    const safeUrl = sanitizeWebsiteUrl(raw);
    setUrlInput(safeUrl);
    setFrameUrl(safeUrl);

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      widgetStateService
        .saveState(config.widgetId, config.contextId, { url: safeUrl })
        .then(saved => onStateChange?.(saved));
    }, 500);
  };

  return (
    <div className="demo-website">
      <form
        className="demo-website__toolbar"
        onSubmit={event => {
          event.preventDefault();
          applyUrl(urlInput);
        }}
      >
        <label className="demo-website__label" htmlFor={`website-url-${config.widgetId}`}>
          URL
        </label>
        <input
          id={`website-url-${config.widgetId}`}
          className="demo-website__input"
          type="url"
          inputMode="url"
          value={urlInput}
          placeholder="https://example.com"
          onChange={event => setUrlInput(event.target.value)}
          onBlur={() => applyUrl(urlInput)}
        />
        <button className="demo-website__load" type="submit">
          Load
        </button>
      </form>
      <iframe
        className="demo-website__frame"
        title="Embedded website"
        src={frameUrl}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
