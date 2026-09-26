import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasValidAccessToken()) {
    return true;
  }

  if (auth.getRefreshToken()) {
    return auth.refreshAccessToken().pipe(
      map(() => true),
      catchError(() => of(router.createUrlTree(['/login']))),
    );
  }

  return router.createUrlTree(['/login']);
};
