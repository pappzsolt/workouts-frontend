import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';

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
  loginForm!: FormGroup;  // később inicializáljuk
  errorMessage = '';
  loading = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    // Form inicializálása a constructorban
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Kérlek, töltsd ki az összes mezőt!';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { username, password } = this.loginForm.value;

    if (!username || !password) {
      this.errorMessage = 'Felhasználónév és jelszó szükséges.';
      this.loading = false;
      return;
    }

    this.authService.login(username, password)
      .pipe(
        catchError(err => {
          console.error('Login hiba:', err);
          this.errorMessage = 'Hibás felhasználónév vagy jelszó.';
          this.loading = false;
          return of(null);  // null visszaadás hibánál
        })
      )
      .subscribe((res: LoginResponse | null) => {  // típussal ellátva
        if (res) {
          console.log('Bejelentkezve!', res);
          this.loading = false;
          // ide tehetsz redirectet pl. dashboard-ra
        }
      });
  }
}
