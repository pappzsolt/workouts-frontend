import { Component } from '@angular/core';
import { Router } from '@angular/router';
// mivel egy mappával lejjebb vagyunk, így:
import { DynamicMenuComponent, MenuItem } from '../dynamic-menu.component';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [DynamicMenuComponent],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.css']
})
export class UserMenuComponent {
  userMenuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/user/dashboard' },
    { label: 'Profile', path: '/user/profile' },
    { label: 'Kijelentkezés', action: 'logout' }
  ];

  constructor(private router: Router) {}

  handleMenuAction(action: string) {
    if (action === 'logout') {
      // ide jöhet a tényleges logout logika
      this.router.navigate(['/login']);
    }
  }
}
