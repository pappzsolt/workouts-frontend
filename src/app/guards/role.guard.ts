import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Route data-ban szereplő engedélyezett szerepek (layout szinten)
  const allowedRoles: string[] = route.data['roles'] || [];

  const token = auth.getAccessToken();

  // null-safety: ha nincs role, üres string
  const userRole = auth.getUserRole() ?? '';

  // Ha nincs token vagy szerepkör
  if (!token || !userRole) {
    router.navigate(['/login']);
    return false;
  }

  // Több role kezelése (pl. "ROLE_ADMIN,ROLE_USER")
  const userRoles = userRole.split(',').map(r => r.trim());

  // Ellenőrizzük, hogy van-e közös role az engedélyezettekkel
  const hasAccess = userRoles.some(r => allowedRoles.includes(r));

  if (hasAccess) {
    return true;
  } else {
    router.navigate(['/login']); // layout szintű redirect
    return false;
  }
};
