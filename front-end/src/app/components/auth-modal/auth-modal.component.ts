import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthModalMode } from '../../services/auth/auth.service';
import { ModalComponent } from '../shared/modal/modal.component';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule, ModalComponent],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
})
export class AuthModalComponent {
  readonly authService = inject(AuthService);

  // Campi del form gestiti tramite Signals
  readonly username = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly showPassword = signal(false);

  // Stato UI per caricamento ed errori
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly modalTitle = computed(() =>
    this.authService.authModalMode() === 'LOGIN'
      ? 'Bentornato su QuickSketch'
      : 'Crea un account QuickSketch'
  );

  // Validazione lato client per dare feedback immediato all'utente
  readonly clientValidationError = computed(() => {
    const usr = this.username().trim();
    const pwd = this.password();
    const mode = this.authService.authModalMode();

    if (!usr && !pwd) return null; // Non mostrare errori a form ancora vuoto
    if (usr.length > 0 && usr.length < 3) {
      return 'Lo username deve contenere almeno 3 caratteri.';
    }
    if (pwd.length > 0 && pwd.length < 4) {
      return 'La password deve contenere almeno 4 caratteri.';
    }
    if (mode === 'SIGNUP' && this.confirmPassword().length > 0 && pwd !== this.confirmPassword()) {
      return 'Le due password non coincidono.';
    }
    return null;
  });

  readonly isFormValid = computed(() => {
    const usr = this.username().trim();
    const pwd = this.password();
    if (usr.length < 3 || pwd.length < 4) return false;
    if (this.authService.authModalMode() === 'SIGNUP' && pwd !== this.confirmPassword()) {
      return false;
    }
    return true;
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
    if (!this.isFormValid() || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const usr = this.username().trim();
    const pwd = this.password();
    const request$ =
      this.authService.authModalMode() === 'LOGIN'
        ? this.authService.login(usr, pwd)
        : this.authService.signup(usr, pwd);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.description ||
            err.error?.error ||
            'Si è verificato un errore durante il processo di autenticazione.'
        );
      },
    });
  }

  private resetForm(): void {
    this.username.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.errorMessage.set(null);
    this.isLoading.set(false);
  }
}