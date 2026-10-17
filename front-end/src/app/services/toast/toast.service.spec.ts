import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

// Verifica coda, identificativi e scadenza automatica dei messaggi temporanei.
describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  // Ogni messaggio riceve un id progressivo e conserva il tipo richiesto.
  it('adds toasts with increasing ids and preserves their type', () => {
    service.show('ok');
    service.show('warning', 'WARNING', 10000);
    expect(service.toasts()).toEqual([
      { id: 1, type: 'SUCCESS', text: 'ok' },
      { id: 2, type: 'WARNING', text: 'warning' },
    ]);
  });

  // La rimozione manuale non deve influenzare gli altri messaggi.
  it('dismisses only the requested toast', () => {
    service.show('first', 'INFO', 10000);
    service.show('second', 'ERROR', 10000);
    service.dismiss(1);
    expect(service.toasts()).toEqual([{ id: 2, type: 'ERROR', text: 'second' }]);
  });

  // La durata configurata determina la rimozione automatica del toast.
  it('automatically dismisses a toast after its duration', () => {
    vi.useFakeTimers();
    service.show('temporary', 'INFO', 100);
    vi.advanceTimersByTime(100);
    expect(service.toasts()).toEqual([]);
    vi.useRealTimers();
  });
});
