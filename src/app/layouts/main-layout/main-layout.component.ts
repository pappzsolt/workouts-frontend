import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DynamicMenuComponent, MenuItem } from '../../components/dynamic-menu/dynamic-menu.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,           // ← Hozzáadva, így router-outlet működik
    DynamicMenuComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent {
  menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    {
      label: 'Settings',
      children: [
        { label: 'Profile', path: '/settings/profile' },
        { label: 'Security', path: '/settings/security' }
      ]
    },
    { label: 'Logout', action: 'logout' }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  handleMenuAction(action: string) {
    if (action === 'logout') {
      this.authService.logout();
      this.router.navigate(['/login']);
    } else if (action) {
      this.router.navigate([action]);
    }
  }
}

