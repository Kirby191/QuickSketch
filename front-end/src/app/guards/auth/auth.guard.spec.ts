import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { authGuard } from './auth.guard';

// Verifica il confine di accesso delle rotte riservate agli utenti autenticati.
describe('authGuard', () => {
  let auth: { isAuthenticated: ReturnType<typeof vi.fn>; openAuthModal: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    auth = { isAuthenticated: vi.fn(), openAuthModal: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    router = TestBed.inject(Router);
  });

  // Una sessione valida lascia proseguire la navigazione senza aprire il modale.
  it('allows authenticated users', () => {
    auth.isAuthenticated.mockReturnValue(true);
    expect(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/draw' } as RouterStateSnapshot))).toBe(true);
    expect(auth.openAuthModal).not.toHaveBeenCalled();
  });

  // Un ospite viene riportato alla home e conserva la destinazione richiesta nel login.
  it('opens login and redirects unauthenticated users to the root', () => {
    auth.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/draw' } as RouterStateSnapshot));
    expect(auth.openAuthModal).toHaveBeenCalledWith('LOGIN', '/draw');
    expect(result).toEqual(router.createUrlTree(['/']));
  });
});
