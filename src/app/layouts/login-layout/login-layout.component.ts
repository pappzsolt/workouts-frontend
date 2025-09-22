import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // ← kell

@Component({
  selector: 'app-login-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet], // ← ide is be kell tenni
  template: `
    <div class="flex min-h-screen justify-center items-center">
      <div class="w-full max-w-md">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class LoginLayoutComponent {}
