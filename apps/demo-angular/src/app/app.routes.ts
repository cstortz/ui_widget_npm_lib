import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'workspace/demo' },
  {
    path: 'workspace/:workspaceId',
    loadComponent: () =>
      import('./workspace/workspace-page.component').then(m => m.WorkspacePageComponent),
  },
];
