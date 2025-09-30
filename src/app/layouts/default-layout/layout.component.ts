import { Component, Input, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

// Menü komponenseket importáljuk role alapján
import { AdminMenuComponent } from '../../components/dynamic-menu/admin-menu/admin-menu.component';
import { CoachMenuComponent } from '../../components/dynamic-menu/coach-menu/coach-menu.component';
import { UserMenuComponent } from '../../components/dynamic-menu/user-menu/user-menu.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, AdminMenuComponent, CoachMenuComponent, UserMenuComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  username: string | null = null;
  role: string | null = null;
  currentYear: number = new Date().getFullYear();

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.username = this.authService.getUserName(); // sub-ból jön
    this.role = this.authService.getUserRole();     // roles-ból jön
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.role === 'ROLE_ADMIN';
  }

  isCoach(): boolean {
    return this.role === 'ROLE_COACH';
  }

  isUser(): boolean {
    return this.role === 'ROLE_USER';
  }
}
