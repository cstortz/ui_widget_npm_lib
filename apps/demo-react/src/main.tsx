import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MemoryWidgetStateAdapter } from '@ncs_software/widget-system';
import { WidgetStateProvider } from '@ncs_software/widget-system-react';
import App from './App';
import { createDemoLayoutItems, demoWidgetRegistry } from './demo-widget-registry';
import './styles.css';

const adapter = new MemoryWidgetStateAdapter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WidgetStateProvider
      adapter={adapter}
      registry={demoWidgetRegistry}
      permissions={{
        editLayout: true,
        addWidgets: true,
        removeWidgets: true,
        resize: true,
        reorder: true,
      }}
      defaultItems={createDemoLayoutItems('demo')}
    >
      <BrowserRouter basename="/react">
        <App />
      </BrowserRouter>
    </WidgetStateProvider>
  </StrictMode>
);
