import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DynamicMenuComponent, MenuItem } from '../dynamic-menu.component';

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [DynamicMenuComponent],
  templateUrl: './admin-menu.component.html',
  styleUrls: ['./admin-menu.component.css']
})
export class AdminMenuComponent {
  adminMenuItems: MenuItem[] = [
    { label: 'Admin Dashboard', path: '/admin/dashboard' },
    { label: 'Kijelentkezés', action: 'logout' }
  ];

  constructor(private router: Router) {}

  handleMenuAction(action: string) {
    if (action === 'logout') {
      this.router.navigate(['/login']);
    }
  }
}
