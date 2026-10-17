import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_CONFIG } from '../../config/api.config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const user = { id: 1, username: 'Ada', role: 'USER' as const };
  const response = { token: 'jwt', user };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('loads a persisted session and exposes derived auth state', () => {
    localStorage.setItem('quicksketch_jwt_token', 'stored');
    localStorage.setItem('quicksketch_user', JSON.stringify({ ...user, role: 'ADMIN' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    const restored = TestBed.inject(AuthService);
    expect(restored.token()).toBe('stored');
    expect(restored.currentUser()?.username).toBe('Ada');
    expect(restored.isAuthenticated()).toBe(true);
    expect(restored.isAdmin()).toBe(true);
  });

  it('opens, switches and closes the auth modal', () => {
    service.openAuthModal('SIGNUP', '/draw');
    expect(service.isAuthModalOpen()).toBe(true);
    expect(service.authModalMode()).toBe('SIGNUP');
    service.switchAuthModalMode('LOGIN');
    expect(service.authModalMode()).toBe('LOGIN');
    service.closeAuthModal();
    expect(service.isAuthModalOpen()).toBe(false);
  });

  it('stores the session after login and redirects when requested', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    service.openAuthModal('LOGIN', '/draw');
    service.login(' Ada ', 'secret').subscribe();
    const request = http.expectOne(`${API_CONFIG.endpoints.auth}/login`);
    expect(request.request.body).toEqual({ username: ' Ada ', password: 'secret' });
    request.flush(response);
    expect(service.token()).toBe('jwt');
    expect(service.currentUser()).toEqual(user);
    expect(service.isAuthModalOpen()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/draw');
  });

  it('uses the signup endpoint and clears the session on logout', () => {
    service.signup('Ada', 'secret').subscribe();
    http.expectOne(`${API_CONFIG.endpoints.auth}/signup`).flush(response);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    service.logout();
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
