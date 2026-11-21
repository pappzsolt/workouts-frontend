import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { reloadOnChunkLoadError } from './config/chunk-load-recovery';
import { routes } from './app.routes';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { LanguageInterceptor } from './interceptors/language.interceptor';

import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    // Preserve the existing Zone.js-based change detection when moving to Angular 21+.
    // Angular 21 defaults to zoneless unless Zone.js change detection is requested.
    provideZoneChangeDetection(),

    provideRouter(routes, withNavigationErrorHandler(reloadOnChunkLoadError)),

    provideHttpClient(withInterceptorsFromDi()),

    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },

    {
      provide: HTTP_INTERCEPTORS,
      useClass: LanguageInterceptor,
      multi: true,
    },

    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json',
        enforceLoading: true,
      }),
    }),
  ],
};
