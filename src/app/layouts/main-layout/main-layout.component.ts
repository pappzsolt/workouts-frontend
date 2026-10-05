import type { MenuItem } from '../../models/common/menu-item.model';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DynamicMenuComponent } from '../../components/dynamic-menu/dynamic-menu.component';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // ← Hozzáadva, így router-outlet működik
    DynamicMenuComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
})
export class MainLayoutComponent {
  menuItems: MenuItem[] = [
    { label: 'menu.dashboard', path: '/dashboard' },
    {
      label: 'menu.settings',
      children: [
        { label: 'menu.profile', path: '/settings/profile' },
        { label: 'menu.security', path: '/settings/security' },
      ],
    },
    { label: 'menu.logout', action: 'logout' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  handleMenuAction(action: string) {
    if (action === 'logout') {
      this.authService.logout();
      this.router.navigate(['/login']);
    } else if (action) {
      this.router.navigate([action]);
    }
  }
}
