import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/toast/toast.service';
import { AuthModalComponent } from './auth-modal.component';

// Copre validazione, invio e rendering del modale condiviso di autenticazione.
describe('AuthModalComponent', () => {
  let fixture: ComponentFixture<AuthModalComponent>;
  let component: AuthModalComponent;
  let auth: Record<string, unknown>;
  let mode: ReturnType<typeof signal<'LOGIN' | 'SIGNUP'>>;

  beforeEach(async () => {
    mode = signal<'LOGIN' | 'SIGNUP'>('LOGIN');
    auth = {
      authModalMode: mode,
      isAuthModalOpen: signal(true),
      switchAuthModalMode: vi.fn((value: 'LOGIN' | 'SIGNUP') => mode.set(value)),
      closeAuthModal: vi.fn(),
      login: vi.fn(() => of({ user: { username: 'Ada' }, token: 'jwt' })),
      signup: vi.fn(() => of({ user: { username: 'Ada' }, token: 'jwt' })),
    };
    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        ToastService,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AuthModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // La forza della password aggiorna livello e requisiti esposti all'interfaccia.
  it('computes password requirements and strength levels', () => {
    component.password.set('abc');
    expect(component.passwordStrength().level).toBe('WEAK');
    component.password.set('Abcdef!');
    expect(component.passwordStrength().level).toBe('MEDIUM');
    component.password.set('Abcdef!1');
    expect(component.passwordStrength().level).toBe('STRONG');
    expect(component.pwdChecks()).toEqual({
      minLength: true,
      hasUppercase: true,
      hasSpecial: true,
      hasBonusLengthOrDigit: true,
    });
  });

  // Login e registrazione applicano regole diverse, inclusa la conferma password.
  it('validates login and signup forms differently', () => {
    component.username.set('ab');
    component.password.set('1234');
    expect(component.isFormValid()).toBe(false);
    component.username.set('Ada');
    expect(component.isFormValid()).toBe(true);
    component.switchMode('SIGNUP');
    component.password.set('Abcdef!');
    component.confirmPassword.set('different');
    expect(component.clientValidationError()).toContain('non coincidono');
    expect(component.isFormValid()).toBe(false);
    component.confirmPassword.set('Abcdef!');
    expect(component.isFormValid()).toBe(true);
  });

  // Un login riuscito pulisce il form e informa l'utente tramite toast.
  it('submits login, resets the form and shows a success toast', () => {
    component.username.set(' Ada ');
    component.password.set('secret');
    const toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'show');
    component.onSubmit();
    expect(auth['login']).toHaveBeenCalledWith('Ada', 'secret');
    expect(component.username()).toBe('');
    expect(toast.show).toHaveBeenCalledWith('Bentornato, Ada!', 'SUCCESS');
  });

  // Un rate limit del server viene mostrato e avvia il countdown di blocco.
  it('surfaces auth errors and starts a lockout for HTTP 429', () => {
    auth['login'] = vi.fn(() => throwError(() => ({ status: 429, error: { retryAfterSeconds: 2, description: 'Troppi tentativi' } })));
    component.username.set('Ada');
    component.password.set('secret');
    component.onSubmit();
    expect(component.errorMessage()).toBe('Troppi tentativi');
    expect(component.lockoutSecondsLeft()).toBe(2);
    component.ngOnDestroy();
  });

  // I controlli esclusivi della registrazione e la visibilità password seguono lo stato del modale.
  it('renders signup-only fields and switches password visibility', () => {
    component.switchMode('SIGNUP');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="password-strength-meter"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="auth-confirm-password-input"]')).toBeTruthy();
    const password = fixture.nativeElement.querySelector('[data-testid="auth-password-input"]');
    expect(password.type).toBe('password');
    fixture.nativeElement.querySelector('.toggle-pwd-btn').click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
  });

  // Anche errori privi di descrizione ricevono un messaggio comprensibile.
  it('maps server errors without a description to the fallback message', () => {
    auth['login'] = vi.fn(() => throwError(() => ({ status: 500, error: {} })));
    component.username.set('Ada');
    component.password.set('secret');
    component.onSubmit();
    expect(component.errorMessage()).toContain('Si è verificato un errore');
    expect(component.isLoading()).toBe(false);
  });
});
