import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { Router } from '@angular/router'; // ← Hozzáadva

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
      this.errorMessage = 'Kérlek, töltsd ki az összes mezőt!';
      return;
    }

    const { username, password } = this.loginForm.value;
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(username, password)
      .pipe(
        catchError(err => {
          console.error('Login hiba:', err);
          this.errorMessage = 'Hibás felhasználónév vagy jelszó.';
          this.loading = false;
          return of(null);
        })
      )
      .subscribe((res: LoginResponse | null) => {
        this.loading = false;
        if (res) {
          console.log('Bejelentkezve!', res);
          this.router.navigate(['/dashboard']); // ← Itt navigál a dashboard-ra
        }
      });
  }
}

