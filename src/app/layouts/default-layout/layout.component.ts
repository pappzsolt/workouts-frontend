import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DynamicMenuComponent } from '../../components/dynamic-menu/dynamic-menu.component';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, DynamicMenuComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  username: string | null = null;
  role: string | null = null;
  currentYear: number = new Date().getFullYear();
  currentDate: Date = new Date();

  menuOpen = false; // <-- hamburger menü állapota

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

    // Dátum frissítése másodpercenként
    setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
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

  // Mobil nézet ellenőrzése
  isMobile(): boolean {
    return window.innerWidth < 640; // sm breakpoint
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    if (!this.isMobile()) {
      this.menuOpen = false;
    }
  }
}
