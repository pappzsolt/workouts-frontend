import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode'; // ✅ ESM modul helyes import

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  sub: string;
  id: number;
  roles: string;
  iat: number;
  exp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/auth';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(res => {
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getUserRole(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const decodedToken = jwtDecode<TokenPayload>(token);
      return decodedToken.roles;
    } catch (e) {
      console.error('[AuthService] Token dekódolási hiba', e);
      return null;
    }
  }

  getUserId(): number | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const decodedToken = jwtDecode<TokenPayload>(token);
      return decodedToken.id; // vagy decodedToken.sub, attól függ melyikben van
    } catch (e) {
      console.error('[AuthService] Token dekódolási hiba', e);
      return null;
    }
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'ROLE_ADMIN';
  }

  isCoach(): boolean {
    return this.getUserRole() === 'ROLE_COACH';
  }

  isUser(): boolean {
    return this.getUserRole() === 'ROLE_USER';
  }
  getUserName(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const decodedToken = jwtDecode<TokenPayload>(token);
      return decodedToken.sub; // itt van a felhasználónév
    } catch (e) {
      console.error('[AuthService] Token dekódolási hiba', e);
      return null;
    }
  }


}
