import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { DynamicMenuComponent, MenuItem } from './components/dynamic-menu/dynamic-menu.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, DynamicMenuComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  username = '';
  password = '';
  errorMessage = '';
  mobileMenuOpen = false;

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

  constructor(private http: HttpClient) {}

  login() {
    this.errorMessage = '';
    const payload = { username: this.username, password: this.password };

    this.http.post('http://localhost:8080/auth/login', payload)
      .pipe(
        catchError(err => {
          console.error('Login error:', err);
          this.errorMessage = 'Login failed';
          return of(null);
        })
      )
      .subscribe((res: any) => {
        if (res) {
          console.log('Tokens:', res);
          alert('Login successful! Check console for tokens.');
        }
      });
  }
}
