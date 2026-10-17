import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  const requestToSend = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requestToSend).pipe(
    catchError((error: HttpErrorResponse) => {
      // Se il token è scaduto o invalido (e non siamo già sul login), puliamo la sessione
      if (error.status === 401 && !req.url.includes('/api/auth/')) {
        authService.logout();
        authService.openAuthModal('LOGIN');
      }
      return throwError(() => error);
    })
  );
};