import { CanDeactivateFn } from '@angular/router';
import { DrawComponent } from '../../pages/draw/draw';

export const pendingDrawingGuard: CanDeactivateFn<DrawComponent> = (component) => {
  // Se l'utente sta attivamente disegnando e ha già tracciato qualcosa (e il timer non è scaduto),
  // chiediamo conferma prima di abbandonare la rotta /draw
  if (
    component.phase() === 'DRAWING' &&
    component.strokesCount() > 0 &&
    component.timeLeft() > 0
  ) {
    return window.confirm(
      'Hai uno sketch in corso! Vuoi davvero uscire dalla lavagna e perdere il disegno?'
    );
  }
  return true;
};
