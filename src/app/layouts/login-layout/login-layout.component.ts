import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // ← kell

@Component({
  selector: 'app-login-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet], // ← ide is be kell tenni
  host: { class: 'flex min-w-0 flex-1 flex-col' },
  template: `
    <div class="flex min-w-0 flex-1 items-start justify-center sm:items-center">
      <div class="w-full max-w-md">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class LoginLayoutComponent {}
