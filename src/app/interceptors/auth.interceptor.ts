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
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  finalize,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { API_ENDPOINTS } from '../api-endpoints';

const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

type RefreshResult =
  | { accessToken: string }
  | { error: unknown };

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private readonly refreshResultSubject = new BehaviorSubject<RefreshResult | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    // A web login/refresh/logout nem függhet access tokentől.
    if (this.isWebAuthEndpoint(req.url)) {
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
    if (this.isRefreshing) {
      return this.refreshResultSubject.pipe(
        filter((result): result is RefreshResult => result !== null),
        take(1),
        switchMap((result) => {
          if ('error' in result) {
            return throwError(() => result.error);
          }

          return next.handle(
            req.clone({
              context: req.context.set(AUTH_RETRY, true),
              headers: req.headers.set('Authorization', `Bearer ${result.accessToken}`),
            }),
          );
        }),
      );
    }

    this.isRefreshing = true;
    this.refreshResultSubject.next(null);

    return this.authService.refreshAccessToken().pipe(
      switchMap((response: import('../models/auth-model').LoginResponse) => {
        this.refreshResultSubject.next({ accessToken: response.accessToken });

        return next.handle(
          req.clone({
            context: req.context.set(AUTH_RETRY, true),
            headers: req.headers.set('Authorization', `Bearer ${response.accessToken}`),
          }),
        );
      }),
      catchError((refreshError: unknown) => {
        this.refreshResultSubject.next({ error: refreshError });
        this.clearSessionAndRedirect();

        return throwError(() => refreshError);
      }),
      finalize(() => {
        this.isRefreshing = false;
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

  private isWebAuthEndpoint(url: string): boolean {
    return url === API_ENDPOINTS.authWebLogin
      || url === API_ENDPOINTS.authWebRefresh
      || url === API_ENDPOINTS.authWebLogout;
  }

  private clearSessionAndRedirect(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
