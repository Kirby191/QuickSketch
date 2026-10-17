import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DrawComponent } from '../../pages/draw/draw';
import { pendingDrawingGuard } from './pending-drawing.guard';

// Verifica la protezione dalla perdita di un disegno ancora in corso.
describe('pendingDrawingGuard', () => {
  const execute = (component: Partial<DrawComponent>) =>
    TestBed.runInInjectionContext(() => pendingDrawingGuard(component as DrawComponent, {} as never, {} as never, {} as never));

  beforeEach(() => TestBed.configureTestingModule({}));

  // Nessuna conferma è necessaria prima di iniziare o dopo la scadenza del disegno.
  it('allows navigation when there is no active drawing', () => {
    expect(execute({ phase: signal('SELECT_WORD'), strokesCount: signal(0), timeLeft: signal(60) })).toBe(true);
  });

  // Un disegno attivo richiede conferma e rispetta la scelta dell'utente.
  it('asks for confirmation only for an active non-expired drawing', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(execute({ phase: signal('DRAWING'), strokesCount: signal(2), timeLeft: signal(30) })).toBe(false);
    expect(window.confirm).toHaveBeenCalled();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(execute({ phase: signal('DRAWING'), strokesCount: signal(2), timeLeft: signal(30) })).toBe(true);
  });
});
