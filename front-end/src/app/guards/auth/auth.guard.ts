import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Apre automaticamente il modale di Login e salva la rotta richiesta (es. '/draw')
  authService.openAuthModal('LOGIN', state.url);
  return router.createUrlTree(['/']);
};
