import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles: string[] = route.data['roles'] || [];
  const tokenIsValid = auth.hasValidAccessToken();
  const userRole = auth.getUserRole() ?? '';

  if (!tokenIsValid || !userRole) {
    router.navigate(['/login']);
    return false;
  }

  const userRoles = userRole.split(',').map((r) => r.trim());
  const hasAccess = userRoles.some((r) => allowedRoles.includes(r));

  if (!hasAccess) {

    router.navigate(['/login']);
    return false;
  }

  return true;
};
