import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import { API_ENDPOINTS } from '../../api-endpoints';

import { LoginResponse, TokenPayload } from '../../models/auth-model';
import { ApiResponse } from '../../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = API_ENDPOINTS.auth;

  private readonly rawHttp: HttpClient;

  constructor(
    private readonly http: HttpClient,
    httpBackend: HttpBackend,
  ) {
    // A refresh kérést az interceptor megkerülésével küldjük,
    // hogy a lejárt access token ne kerüljön rá a /auth/refresh kérésre.
    this.rawHttp = new HttpClient(httpBackend);
  }

  /**
   * Bejelentkezés.
   *
   * Backend válasz:
   *
   * ApiResponse<LoginResponse>
   */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.apiUrl}/login`, {
        username,
        password,
      })
      .pipe(
        /*
         * ApiResponse<LoginResponse>
         *        ↓
         * response.data
         *        ↓
         * LoginResponse
         *
         * Így a komponenseknek nem kell
         * az ApiResponse struktúráját ismerniük.
         */
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message ?? 'Sikertelen bejelentkezés.');
          }

          return response.data;
        }),

        /*
         * Tokenek mentése.
         */
        tap((response) => {
          localStorage.setItem('accessToken', response.accessToken);

          localStorage.setItem('refreshToken', response.refreshToken);
        }),
      );
  }

  /**
   * Ellenőrzi, hogy az access token létezik, értelmezhető és még nem járt le.
   *
   * Az exp JWT-ben másodpercben értendő.
   */
  hasValidAccessToken(): boolean {
    const token = this.getAccessToken();

    if (!token) {
      return false;
    }

    try {
      const decodedToken = jwtDecode<TokenPayload>(token);

      return Number.isFinite(decodedToken.exp) && decodedToken.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  }

  /**
   * Access + refresh token frissítése.
   *
   * A backend refresh endpointja új access és új refresh tokent ad vissza
   * (refresh-token rotation).
   */
  refreshAccessToken(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('Nincs refresh token.');
    }

    return this.rawHttp
      .post<ApiResponse<LoginResponse>>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message ?? 'A token frissítése sikertelen.');
          }

          return response.data;
        }),
        tap((response) => {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }


  getUserRole(): string | null {
    const token = this.getAccessToken();

    if (!token) {
      return null;
    }

    try {
      const decodedToken = jwtDecode<TokenPayload>(token);

      return decodedToken.roles;
    } catch (error) {
      console.error('[AuthService] Token dekódolási hiba', error);

      return null;
    }
  }

  getUserId(): number | null {
    const token = this.getAccessToken();

    if (!token) {
      return null;
    }

    try {
      const decodedToken = jwtDecode<TokenPayload>(token);

      return decodedToken.id;
    } catch (error) {
      console.error('[AuthService] Token dekódolási hiba', error);

      return null;
    }
  }

  getUserName(): string | null {
    const token = this.getAccessToken();

    if (!token) {
      return null;
    }

    try {
      const decodedToken = jwtDecode<TokenPayload>(token);

      return decodedToken.sub;
    } catch (error) {
      console.error('[AuthService] Token dekódolási hiba', error);

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
}
