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

  // Az access token csak memóriában él. F5 után ezért mindig megpróbálunk
  // új access tokent kérni a HttpOnly refresh cookie-val. Ha nincs érvényes
  // cookie, a backend 401-et ad és visszairányítunk loginra.
  return auth.refreshAccessToken().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
