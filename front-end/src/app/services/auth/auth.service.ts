import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from '../../models/api.models';
import { API_CONFIG } from '../../config/api.config';

const TOKEN_KEY = 'quicksketch_jwt_token';
const USER_KEY = 'quicksketch_user';

export type AuthModalMode = 'LOGIN' | 'SIGNUP';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Inietta le dipendenze necessarie per le chiamate HTTP e la navigazione
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = API_CONFIG.endpoints.auth;

  // Stato di sessione (JWT + User)
  private readonly currentUserSignal = signal<User | null>(this.loadUserFromStorage());
  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  // Stato del Modale condiviso di Login / Registrazione
  private readonly authModalOpenSignal = signal<boolean>(false);
  private readonly authModalModeSignal = signal<AuthModalMode>('LOGIN');
  private redirectUrlAfterLogin: string | null = null;

  // Selettori pubblici Readonly
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal() && !!this.currentUserSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'ADMIN');

  readonly isAuthModalOpen = this.authModalOpenSignal.asReadonly();
  readonly authModalMode = this.authModalModeSignal.asReadonly();

  private loadUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  // Metodi per aprire/chiudere il modale da qualsiasi componente o Guard
  openAuthModal(mode: AuthModalMode = 'LOGIN', redirectUrl: string | null = null): void {
    this.authModalModeSignal.set(mode);
    this.redirectUrlAfterLogin = redirectUrl;
    this.authModalOpenSignal.set(true);
  }

  closeAuthModal(): void {
    this.authModalOpenSignal.set(false);
    this.redirectUrlAfterLogin = null;
  }

  switchAuthModalMode(mode: AuthModalMode): void {
    this.authModalModeSignal.set(mode);
  }

  signup(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/signup`, { username, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.router.navigate(['/']);
  }

  private setSession(authResult: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, authResult.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authResult.user));
    this.tokenSignal.set(authResult.token);
    this.currentUserSignal.set(authResult.user);

    const targetUrl = this.redirectUrlAfterLogin;
    this.closeAuthModal();

    if (targetUrl) {
      this.router.navigateByUrl(targetUrl);
    }
  }
}
