import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { USER_MESSAGES } from '../../constants/user-messages';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';
  loading = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(event?: Event) {
    if (event) event.preventDefault();

    if (this.loginForm.invalid) {
      this.errorMessage = USER_MESSAGES.required;
      return;
    }

    const { username, password } = this.loginForm.value;
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(username, password)
      .pipe(
        catchError(err => {
          console.error('Login hiba:', err);
          this.errorMessage = USER_MESSAGES.userOrPassFailed;
          this.loading = false;
          return of(null);
        })
      )
      .subscribe((res: LoginResponse | null) => {
        this.loading = false;
        if (res) {
          console.log('Bejelentkezve!', res);

          // -------------------------------
          // Role alapján történő navigáció (null-safety)
          // -------------------------------
          const role = this.authService.getUserRole() ?? ''; // ha null, üres string

          if (role.includes('ROLE_ADMIN')) this.router.navigate(['/admin/dashboard']);
          else if (role.includes('ROLE_COACH')) this.router.navigate(['/coach/dashboard']);
          else if (role.includes('ROLE_USER')) this.router.navigate(['/user/dashboard']);
          else this.router.navigate(['/login']); // ha nincs érvényes role
        }
      });
  }
}
