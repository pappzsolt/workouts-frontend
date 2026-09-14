import { Injectable } from '@angular/core';

import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable()
export class LanguageInterceptor implements HttpInterceptor {
  private readonly defaultLanguage = 'hu';

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    /*
     * Csak a saját backend API hívásokat módosítjuk.
     */
    if (!request.url.startsWith(environment.apiUrl)) {
      return next.handle(request);
    }

    /*
     * A nyelvet közvetlenül a localStorage-ból olvassuk.
     *
     * Így nincs:
     * LanguageInterceptor
     * -> LanguageService
     * -> TranslateService
     * -> HttpClient
     * -> HTTP_INTERCEPTORS
     * körkörös függőség.
     */
    const language = localStorage.getItem('language') || this.defaultLanguage;

    const languageRequest = request.clone({
      params: request.params.set('language', language),
    });

    return next.handle(languageRequest);
  }
}
