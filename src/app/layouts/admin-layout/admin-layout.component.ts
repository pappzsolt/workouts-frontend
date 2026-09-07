import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AdminMenuComponent } from '../../components/dynamic-menu/admin-menu/admin-menu.component';
import { AuthService } from '../../services/auth/auth.service';
import { SHARED_IMPORTS } from '../../components/shared/shared-imports';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [...SHARED_IMPORTS, RouterModule, AdminMenuComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
})
export class AdminLayoutComponent implements OnInit {
  username: string | null = null;
  role: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUserName();
    this.role = this.authService.getUserRole();
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
