import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/gallery/gallery').then((m) => m.GalleryComponent),
    title: 'QuickSketch — Galleria Sketch',
  },
  {
    path: 'leaderboards',
    loadComponent: () =>
      import('./pages/leaderboards/leaderboards').then(
        (m) => m.LeaderboardsComponent
      ),
    title: 'QuickSketch — Classifiche',
  },
  {
    path: '**',
    redirectTo: '',
  },
];