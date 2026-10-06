import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = route.data['roles'] || [];

  const checkRole = () => {
    const userRole = auth.getUserRole() ?? '';
    if (!auth.hasValidAccessToken() || !userRole) {
      return router.createUrlTree(['/login']);
    }

    const userRoles = userRole.split(',').map((role) => role.trim());
    if (userRoles.some((role) => allowedRoles.includes(role))) {
      return true;
    }

    const dashboard = userRoles.includes('ROLE_ADMIN') ? '/admin/dashboard'
      : userRoles.includes('ROLE_COACH') ? '/coach/dashboard'
      : userRoles.includes('ROLE_USER') ? '/user/dashboard' : '/login';
    return router.createUrlTree([dashboard]);
  };

  if (auth.hasValidAccessToken()) {
    return checkRole();
  }

  // A párhuzamos authGuard ugyanazt a megosztott refresh kérést várja.
  // A szerepkört csak a cookie-s munkamenet helyreállítása után ellenőrizzük.
  return auth.refreshAccessToken().pipe(
    map(() => checkRole()),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
