import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { pendingDrawingGuard } from './guards/pending-drawing/pending-drawing.guard';

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
    path: 'draw',
    canActivate: [authGuard],
    canDeactivate: [pendingDrawingGuard],
    loadComponent: () =>
      import('./pages/draw/draw').then((m) => m.DrawComponent),
    title: 'QuickSketch — Disegna in 60s',
  },
  {
    path: 'sketches/:id',
    loadComponent: () =>
      import('./pages/play-sketch/play-sketch').then(
        (m) => m.PlaySketchComponent
      ),
    title: 'QuickSketch — Indovina lo Sketch',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile').then((m) => m.ProfileComponent),
    title: 'QuickSketch — Le Mie Statistiche',
  },
  {
    path: '**',
    redirectTo: '',
  },
];