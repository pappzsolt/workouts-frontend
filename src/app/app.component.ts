import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicMenuComponent, MenuItem } from './components/dynamic-menu/dynamic-menu.component';
import { LoginComponent } from './components/login/login.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DynamicMenuComponent, LoginComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  // Menu items marad a kódod szerint
  menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Users', path: '/users' },
    {
      label: 'Settings',
      children: [
        { label: 'Profile', path: '/settings/profile' },
        { label: 'Security', path: '/settings/security' }
      ]
    }
  ];
}
