import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DynamicMenuComponent, MenuItem } from '../dynamic-menu.component';

@Component({
  selector: 'app-coach-menu',
  standalone: true,
  imports: [DynamicMenuComponent],
  templateUrl: './coach-menu.component.html',
  styleUrls: ['./coach-menu.component.css']
})
export class CoachMenuComponent {
  coachMenuItems: MenuItem[] = [
    { label: 'Coach Dashboard', path: '/coach/dashboard' },
    { label: 'Kijelentkezés', action: 'logout' }
  ];

  constructor(private router: Router) {}

  handleMenuAction(action: string) {
    if (action === 'logout') {
      this.router.navigate(['/login']);
    }
  }
}
