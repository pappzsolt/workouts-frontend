import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex justify-center items-center h-screen bg-gray-100">
      <div class="bg-white p-8 rounded shadow-md w-96">
        <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
        <form (ngSubmit)="login()" #loginForm="ngForm" class="space-y-4">
          <div>
            <label class="block mb-1">Username</label>
            <input
              type="text"
              [(ngModel)]="username"
              name="username"
              required
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div>
            <label class="block mb-1">Password</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <button
            type="submit"
            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Login
          </button>
        </form>
        <p *ngIf="errorMessage" class="text-red-500 mt-4 text-center">{{ errorMessage }}</p>
      </div>
    </div>
  `
})
export class AppComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private http: HttpClient) {}

  login() {
    this.errorMessage = '';
    const payload = { username: this.username, password: this.password };

    this.http.post('http://localhost:8080/auth/login', payload)
      .pipe(
        catchError(err => {
          this.errorMessage = 'Login failed';
          throw err;
        })
      )
      .subscribe((res: any) => {
        console.log('Tokens:', res);
        alert('Login successful! Check console for tokens.');
      });
  }
}
