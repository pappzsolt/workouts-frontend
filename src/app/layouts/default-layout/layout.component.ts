import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <--- ide
import { RouterModule, Router } from '@angular/router';
import { DynamicMenuComponent } from '../../components/dynamic-menu/dynamic-menu.component';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, DynamicMenuComponent], // <--- ide
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  username: string | null = null;
  role: string | null = null;
  currentYear: number = new Date().getFullYear();

  adminMenuItems = [
    { label: 'Admin Dashboard', path: '/admin/dashboard' },
    { label: 'Felhasználók listája', path: '/admin/users' },
    { label: 'Kijelentkezés', action: 'logout' }
  ];

  coachMenuItems = [
    { label: 'Coach Dashboard', path: '/coach/dashboard' },
    { label: 'Profile', path: '/coach/profile' },
    { label: 'Kijelentkezés', action: 'logout' }
  ];

  userMenuItems = [
    { label: 'Dashboard', path: '/user/dashboard' },
    { label: 'Profile', path: '/user/profile' },
    { label: 'Kijelentkezés', action: 'logout' }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.username = this.authService.getUserName();
    this.role = this.authService.getUserRole();
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean { return this.role === 'ROLE_ADMIN'; }
  isCoach(): boolean { return this.role === 'ROLE_COACH'; }
  isUser(): boolean { return this.role === 'ROLE_USER'; }

  handleMenuAction(action: string | any) {
    if (action === 'logout') {
      this.onLogout();
    }
  }
}
