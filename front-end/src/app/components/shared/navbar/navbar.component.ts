import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly authService = inject(AuthService);

  // Controlla l'apertura del menu a tendina su schermi mobile (< 768px)
  readonly isMobileMenuOpen = signal(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  openLogin(): void {
    this.closeMobileMenu();
    this.authService.openAuthModal('LOGIN');
  }

  openSignup(): void {
    this.closeMobileMenu();
    this.authService.openAuthModal('SIGNUP');
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
