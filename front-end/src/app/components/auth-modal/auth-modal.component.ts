import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthModalMode } from '../../services/auth/auth.service';
import { ToastService } from '../../services/toast/toast.service';
import { ModalComponent } from '../shared/modal/modal.component';

const UPPERCASE_REGEX = /[A-Z]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~;']/;
const DIGIT_REGEX = /[0-9]/;

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule, ModalComponent],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
})
export class AuthModalComponent implements OnDestroy {
  readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  // Campi del form
  readonly username = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly showPassword = signal(false);

  // Stato UI e Anti-Bruteforce Lockout
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lockoutSecondsLeft = signal<number>(0);
  private lockoutTimer: ReturnType<typeof setInterval> | null = null;

  readonly modalTitle = computed(() =>
    this.authService.authModalMode() === 'LOGIN'
      ? 'Bentornato su QuickSketch'
      : 'Crea un account QuickSketch'
  );

  // --- REQUISITI INTERATTIVI DELLA PASSWORD (Checklist con ✓ e ✕) ---
  readonly pwdChecks = computed(() => {
    const pwd = this.password();
    return {
      minLength: pwd.length >= 6,
      hasUppercase: UPPERCASE_REGEX.test(pwd),
      hasSpecial: SPECIAL_CHAR_REGEX.test(pwd),
      hasBonusLengthOrDigit: pwd.length >= 8 || DIGIT_REGEX.test(pwd),
    };
  });

  // Valutazione Barra Semaforica (Rossa -> Arancione -> Verde)
  readonly passwordStrength = computed(() => {
    const pwd = this.password();
    const checks = this.pwdChecks();
    if (!pwd) {
      return {
        level: 'NONE',
        widthPercent: 0,
        label: '',
        colorClass: 'bg-slate-800',
        textClass: 'text-slate-400',
      };
    }

    const mandatoryPassed =
      (checks.minLength ? 1 : 0) +
      (checks.hasUppercase ? 1 : 0) +
      (checks.hasSpecial ? 1 : 0);

    // 1. ROSSA: Meno di 2 requisiti soddisfatti
    if (mandatoryPassed <= 1) {
      return {
        level: 'WEAK',
        widthPercent: 33,
        label: 'Poco sicura',
        colorClass: 'bg-rose-500',
        textClass: 'text-rose-400',
      };
    }

    // 2. ARANCIONE: 2 requisiti soddisfatti (oppure tutti e 3 ma molto corta < 8 e senza numeri)
    if (mandatoryPassed === 2 || !checks.hasBonusLengthOrDigit) {
      return {
        level: 'MEDIUM',
        widthPercent: 66,
        label: 'Sicurezza media',
        colorClass: 'bg-amber-500',
        textClass: 'text-amber-400',
      };
    }

    // 3. VERDE: Tutti i requisiti obbligatori + lunghezza >= 8 o numeri
    return {
      level: 'STRONG',
      widthPercent: 100,
      label: 'Ottima password sicura',
      colorClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
    };
  });

  readonly clientValidationError = computed(() => {
    const usr = this.username().trim();
    const pwd = this.password();
    const mode = this.authService.authModalMode();

    if (!usr && !pwd) return null;
    if (usr.length > 0 && usr.length < 3) {
      return 'Lo username deve contenere almeno 3 caratteri.';
    }

    if (mode === 'SIGNUP') {
      if (this.confirmPassword().length > 0 && pwd !== this.confirmPassword()) {
        return 'Le due password non coincidono.';
      }
    }
    return null;
  });

  readonly isFormValid = computed(() => {
    if (this.lockoutSecondsLeft() > 0) return false;

    const usr = this.username().trim();
    const pwd = this.password();
    const mode = this.authService.authModalMode();

    if (usr.length < 3) return false;

    // In fase di Login basta che la password non sia vuota (es. per account storici)
    if (mode === 'LOGIN') {
      return pwd.length >= 4;
    }

    // In fase di Registrazione imponiamo tutti i 3 requisiti di sicurezza + conferma password
    const checks = this.pwdChecks();
    return (
      checks.minLength &&
      checks.hasUppercase &&
      checks.hasSpecial &&
      pwd === this.confirmPassword()
    );
  });

  switchMode(mode: AuthModalMode): void {
    this.errorMessage.set(null);
    this.authService.switchAuthModalMode(mode);
  }

  onClose(): void {
    this.resetForm();
    this.authService.closeAuthModal();
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.isLoading() || this.lockoutSecondsLeft() > 0) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const usr = this.username().trim();
    const pwd = this.password();
    const isLogin = this.authService.authModalMode() === 'LOGIN';

    const request$ = isLogin
      ? this.authService.login(usr, pwd)
      : this.authService.signup(usr, pwd);

    request$.subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.resetForm();
        this.toastService.show(
          isLogin
            ? `Bentornato, ${res.user.username}!`
            : `Account creato! Benvenuto, ${res.user.username}!`,
          'SUCCESS'
        );
      },
      error: (err) => {
        this.isLoading.set(false);

        // Gestione specifica del Punishment Anti-Bruteforce (HTTP 429)
        if (err.status === 429) {
          const waitSec = err.error?.retryAfterSeconds || 15;
          this.startLockoutCountdown(waitSec);
        }

        this.errorMessage.set(
          err.error?.description ||
            err.error?.error ||
            'Si è verificato un errore durante il processo di autenticazione.'
        );
      },
    });
  }

  private startLockoutCountdown(seconds: number): void {
    this.clearLockoutTimer();
    this.lockoutSecondsLeft.set(seconds);

    this.lockoutTimer = setInterval(() => {
      const next = this.lockoutSecondsLeft() - 1;
      if (next <= 0) {
        this.lockoutSecondsLeft.set(0);
        this.errorMessage.set(null);
        this.clearLockoutTimer();
      } else {
        this.lockoutSecondsLeft.set(next);
      }
    }, 1000);
  }

  private clearLockoutTimer(): void {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
      this.lockoutTimer = null;
    }
  }

  private resetForm(): void {
    this.username.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.errorMessage.set(null);
    this.isLoading.set(false);
  }

  ngOnDestroy(): void {
    this.clearLockoutTimer();
  }
}