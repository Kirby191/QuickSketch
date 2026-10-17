import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let auth: { token: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn>; openAuthModal: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    auth = { token: vi.fn(), logout: vi.fn(), openAuthModal: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
  });

  it('adds a bearer token when authenticated', () => {
    auth.token.mockReturnValue('jwt');
    const next = vi.fn((req: HttpRequest<unknown>) => {
      expect(req.headers.get('Authorization')).toBe('Bearer jwt');
      return of(new HttpResponse({ status: 200 }));
    });
    TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', '/api/sketches'), next)).subscribe();
    expect(next).toHaveBeenCalled();
  });

  it('leaves anonymous requests unchanged', () => {
    auth.token.mockReturnValue(null);
    const next = vi.fn((req: HttpRequest<unknown>) => {
      expect(req.headers.has('Authorization')).toBe(false);
      return of(new HttpResponse({ status: 200 }));
    });
    TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', '/api/sketches'), next)).subscribe();
  });

  it('clears auth state on an unauthorized non-auth response', () => {
    auth.token.mockReturnValue('jwt');
    const error = new HttpErrorResponse({ status: 401, url: '/api/sketches' });
    TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', error.url!), () => throwError(() => error))).subscribe({
      error: () => undefined,
    });
    expect(auth.logout).toHaveBeenCalled();
    expect(auth.openAuthModal).toHaveBeenCalledWith('LOGIN');
  });

  it('does not clear auth state for auth endpoint failures', () => {
    const error = new HttpErrorResponse({ status: 401, url: '/api/auth/login' });
    TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('POST', error.url!, null), () => throwError(() => error))).subscribe({
      error: () => undefined,
    });
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
