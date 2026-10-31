import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpContextToken,
} from '@angular/common/http';
import {
  Observable,
  catchError,
  switchMap,
  throwError,
} from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { API_ENDPOINTS } from '../api-endpoints';
import { environment } from '../../environments/environment';

const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // A web login/refresh/logout nem függhet access tokentől.
    if (!this.isApiUrl(req.url) || this.isWebAuthEndpoint(req.url)) {
      return next.handle(req);
    }

    const authReq = this.addAccessToken(req);

    return next.handle(authReq).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          return throwError(() => error);
        }

        // Ugyanazt a kérést csak egyszer próbáljuk új access tokennel.
        if (req.context.get(AUTH_RETRY)) {
          this.clearSessionAndRedirect();
          return throwError(() => error);
        }

        return this.handleUnauthorized(req, next);
      }),
    );
  }

  private handleUnauthorized(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    // AuthService owns the shared refresh and invokes failure handling once.
    return this.authService.refreshAccessToken(() => this.clearSessionAndRedirect()).pipe(
      switchMap(response => this.retryWithToken(req, next, response.accessToken)),
    );
  }

  private retryWithToken(
    req: HttpRequest<unknown>,
    next: HttpHandler,
    accessToken: string,
  ): Observable<HttpEvent<unknown>> {
    return next
      .handle(
        req.clone({
          context: req.context.set(AUTH_RETRY, true),
          headers: req.headers.set('Authorization', `Bearer ${accessToken}`),
        }),
      )
      .pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.clearSessionAndRedirect();
          }
          return throwError(() => error);
        }),
      );
  }

  private addAccessToken(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.authService.getAccessToken();

    if (!token) {
      return req;
    }

    return req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  private isApiUrl(url: string): boolean {
    try {
      const api = new URL(environment.apiUrl, window.location.origin);
      const target = new URL(url, document.baseURI);
      const path = api.pathname.replace(/\/$/, '');
      return target.origin === api.origin &&
        (target.pathname === path || target.pathname.startsWith(`${path}/`));
    } catch {
      return false;
    }
  }

  private isWebAuthEndpoint(url: string): boolean {
    return (
      url === API_ENDPOINTS.authWebLogin ||
      url === API_ENDPOINTS.authWebRefresh ||
      url === API_ENDPOINTS.authWebLogout
    );
  }

  private clearSessionAndRedirect(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
