import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles: string[] = route.data['roles'] || [];
  const token = auth.getAccessToken();
  const userRole = auth.getUserRole() ?? '';

  console.log('[roleGuard] token:', token);
  console.log('[roleGuard] userRole:', userRole);
  console.log('[roleGuard] allowedRoles:', allowedRoles);

  if (!token || !userRole) {
    console.warn('[roleGuard] no token or role, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  const userRoles = userRole.split(',').map(r => r.trim());
  const hasAccess = userRoles.some(r => allowedRoles.includes(r));

  console.log('[roleGuard] userRoles array:', userRoles);
  console.log('[roleGuard] hasAccess:', hasAccess);

  if (!hasAccess) {
    console.warn('[roleGuard] access denied, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  return true;
};
