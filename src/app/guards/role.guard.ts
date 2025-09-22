// src/app/guards/role.guard.ts
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Route data-ban szereplő engedélyezett szerepek tömbje
  const allowedRoles: string[] = route.data['roles'] || [];
  console.log('[RoleGuard] Allowed roles for this route:', allowedRoles);

  // Felhasználó szerepköre a tokenből
  const token = auth.getAccessToken();
  console.log('[RoleGuard] Access token:', token);

  const userRole = auth.getUserRole();
  console.log('[RoleGuard] Decoded user role string:', userRole);

  if (!token || !userRole) {
    console.log('[RoleGuard] No token or role found, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  // Ha több role van a tokenben, spliteljük őket (pl. "ROLE_ADMIN,ROLE_USER")
  const userRoles = userRole.split(',').map(r => r.trim());
  console.log('[RoleGuard] User roles array:', userRoles);

  // Ellenőrizzük, hogy van-e közös role az engedélyezettekkel
  const hasAccess = userRoles.some(r => allowedRoles.includes(r));
  console.log('[RoleGuard] Has access:', hasAccess);

  if (hasAccess) {
    console.log('[RoleGuard] Access granted');
    return true;
  } else {
    console.log('[RoleGuard] Access denied, redirecting to fallback');
    router.navigate(['/dashboard']); // fallback oldal
    return false;
  }
};
