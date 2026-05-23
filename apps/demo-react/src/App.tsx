import { Navigate, Route, Routes } from 'react-router-dom';
import { WorkspacePage } from './workspace/WorkspacePage';

export default function App() {
  return (
    <>
      <header className="demo-header">
        <h1>@ncs_software/widget-system</h1>
        <p>React demo — 12-column grid workspace with runtime layout editing</p>
      </header>
      <main className="demo-main">
        <Routes>
          <Route path="/" element={<Navigate to="/workspace/demo" replace />} />
          <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
        </Routes>
      </main>
    </>
  );
}
