import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Route data-ban szereplő engedélyezett szerepek (layout szinten)
  const allowedRoles: string[] = route.data['roles'] || [];
  console.log('[RoleGuard] Allowed roles for this route/layout:', allowedRoles);

  const token = auth.getAccessToken();
  console.log('[RoleGuard] Access token:', token);

  // null-safety: ha nincs role, üres string
  const userRole = auth.getUserRole() ?? '';
  console.log('[RoleGuard] Decoded user role string:', userRole);

  // Ha nincs token vagy szerepkör
  if (!token || !userRole) {
    console.log('[RoleGuard] No token or role found, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  // Több role kezelése (pl. "ROLE_ADMIN,ROLE_USER")
  const userRoles = userRole.split(',').map(r => r.trim());
  console.log('[RoleGuard] User roles array:', userRoles);

  // Ellenőrizzük, hogy van-e közös role az engedélyezettekkel
  const hasAccess = userRoles.some(r => allowedRoles.includes(r));
  console.log('[RoleGuard] Has access:', hasAccess);

  if (hasAccess) {
    console.log('[RoleGuard] Access granted');
    return true;
  } else {
    console.log('[RoleGuard] Access denied, redirecting to login');
    router.navigate(['/login']); // layout szintű redirect
    return false;
  }
};
