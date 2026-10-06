import { Injectable, inject } from '@angular/core';
import { LoggerService } from '../logger.service';
import { HttpClient, HttpBackend, HttpParams } from '@angular/common/http';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import { API_ENDPOINTS } from '../../api-endpoints';

import { LoginResponse, TokenPayload } from '../../models/auth-model';
import { ApiResponse } from '../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly logger = inject(LoggerService);

  private readonly rawHttp: HttpClient;

  /**
   * A web access token kizárólag memóriában él.
   * Böngésző-frissítés után a HttpOnly refresh cookie-ból kérünk újat.
   */
  private accessToken: string | null = null;

  private refreshInFlight$: Observable<LoginResponse> | null = null;

  constructor(
    private readonly http: HttpClient,
    httpBackend: HttpBackend,
  ) {
    // A refresh/logout kéréseket az interceptor megkerülésével küldjük.
    this.rawHttp = new HttpClient(httpBackend);

    // Korábbi verzióból visszamaradt tokeneket eltávolítjuk. A továbbiakban
    // sem access, sem refresh token nem kerül tartós browser storage-ba.
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Web login.
   *
   * A backend csak az access tokent adja JSON-ban; a refresh token
   * HttpOnly cookie-ban érkezik, ezért withCredentials szükséges.
   */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        API_ENDPOINTS.authWebLogin,
        { username, password },
        {
          params: this.languageParams(),
          withCredentials: true,
        },
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message ?? 'Sikertelen bejelentkezés.');
          }

          return response.data;
        }),
        tap((response) => {
          this.accessToken = response.accessToken;
        }),
      );
  }

  /**
   * Ellenőrzi, hogy az access token létezik, értelmezhető és még nem járt le.
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
   * Elfelejtett jelszó: reset email kérése.
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.rawHttp
      .post<ApiResponse<{ message: string }>>(
        API_ENDPOINTS.authForgotPassword,
        { email },
        { params: this.languageParams() },
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message ?? 'A jelszó-visszaállítási kérés sikertelen.');
          }

          return response.data;
        }),
      );
  }

  /**
   * Jelszó visszaállítása az emailben kapott egyszer használatos tokennel.
   */
  resetPassword(token: string, newPassword: string): Observable<ApiResponse<null>> {
    return this.rawHttp
      .post<ApiResponse<null>>(
        API_ENDPOINTS.authResetPassword,
        {
          token,
          newPassword,
        },
        { params: this.languageParams() },
      )
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message ?? 'A jelszó visszaállítása sikertelen.');
          }

          return response;
        }),
      );
  }

  /**
   * Új access token kérése a böngésző által automatikusan küldött
   * HttpOnly refresh cookie-val.
   */
  refreshAccessToken(): Observable<LoginResponse> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const request$ = this.rawHttp
      .post<ApiResponse<LoginResponse>>(
        API_ENDPOINTS.authWebRefresh,
        {},
        {
          params: this.languageParams(),
          withCredentials: true,
        },
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message ?? 'A token frissítése sikertelen.');
          }

          return response.data;
        }),
        tap((response) => {
          this.accessToken = response.accessToken;
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.refreshInFlight$ = request$;

    return request$;
  }

  /**
   * A memóriában levő access token azonnal törlődik, majd a backend
   * visszavonja a HttpOnly refresh tokent és törli a cookie-t.
   */
  logout(): void {
    this.accessToken = null;

    // Régi deploymentből esetleg visszamaradt storage tokeneket is töröljük.
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    this.rawHttp
      .post<ApiResponse<null>>(
        API_ENDPOINTS.authWebLogout,
        {},
        {
          params: this.languageParams(),
          withCredentials: true,
        },
      )
      .subscribe({
        error: (error) => {
          this.logger.warn(
            '[AuthService] Refresh cookie visszavonása sikertelen.',
            error,
          );
        },
      });
  }

  private languageParams(): HttpParams {
    const savedLanguage = localStorage.getItem('language');
    const language =
      savedLanguage === 'en' || savedLanguage === 'de' || savedLanguage === 'hu'
        ? savedLanguage
        : 'hu';

    return new HttpParams().set('language', language);
  }

  getAccessToken(): string | null {
    return this.accessToken;
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
      this.logger.error('[AuthService] Token dekódolási hiba', error);

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
      this.logger.error('[AuthService] Token dekódolási hiba', error);

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
      this.logger.error('[AuthService] Token dekódolási hiba', error);

      return null;
    }
  }

  getUserRoles(): string[] {
    return (this.getUserRole() ?? '')
      .split(',')
      .map((role) => role.trim())
      .filter((role) => role.length > 0);
  }

  isAdmin(): boolean {
    return this.getUserRoles().includes('ROLE_ADMIN');
  }

  isCoach(): boolean {
    return this.getUserRoles().includes('ROLE_COACH');
  }

  isUser(): boolean {
    return this.getUserRoles().includes('ROLE_USER');
  }
}
