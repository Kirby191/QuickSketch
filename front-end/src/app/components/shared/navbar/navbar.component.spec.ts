import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { NavbarComponent } from './navbar.component';

// Verifica navigazione, sessione e comportamento responsive della barra principale.
describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let auth: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    isAdmin: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<{ username: string } | null>>;
    openAuthModal: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    auth = {
      isAuthenticated: signal(false),
      isAdmin: signal(false),
      currentUser: signal(null),
      openAuthModal: vi.fn(),
      logout: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // I comandi di accesso aprono la modalità corretta e chiudono il menu mobile.
  it('opens the appropriate auth modal and closes mobile navigation', () => {
    component.isMobileMenuOpen.set(true);
    component.openLogin();
    expect(auth.openAuthModal).toHaveBeenCalledWith('LOGIN');
    expect(component.isMobileMenuOpen()).toBe(false);
    component.openSignup();
    expect(auth.openAuthModal).toHaveBeenCalledWith('SIGNUP');
  });

  // Il menu mobile può essere aperto e chiuso esplicitamente.
  it('toggles and closes the mobile menu', () => {
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen()).toBe(true);
    component.closeMobileMenu();
    expect(component.isMobileMenuOpen()).toBe(false);
  });

  // Il logout viene delegato al servizio di autenticazione.
  it('delegates logout', () => {
    component.logout();
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  // Un utente autenticato vede i link personali e le funzioni amministrative disponibili.
  it('renders authenticated desktop and mobile navigation', () => {
    auth.isAuthenticated.set(true);
    auth.currentUser.set({ username: 'Ada' });
    auth.isAdmin.set(true);
    component.isMobileMenuOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-draw-link"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-profile-link"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-username"]').textContent).toContain('Ada');
    expect(fixture.nativeElement.querySelector('[data-testid="nav-logout-btn"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Admin');
  });
});
