import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly defaultLanguage: LanguageCode = 'hu';

  private readonly languageSubject = new BehaviorSubject<LanguageCode>(this.defaultLanguage);

  public readonly language$: Observable<LanguageCode> = this.languageSubject.asObservable();

  constructor(private translate: TranslateService) {
    this.translate.setFallbackLang(this.defaultLanguage);

    const savedLanguage = localStorage.getItem('language');

    const language: LanguageCode = isLanguageCode(savedLanguage) ? savedLanguage : this.defaultLanguage;

    this.translate.use(language);

    this.languageSubject.next(language);
  }

  setLanguage(language: LanguageCode): void {
    localStorage.setItem('language', language);

    this.translate.use(language);

    this.languageSubject.next(language);
  }

  getCurrentLanguage(): LanguageCode {
    const currentLanguage = this.translate.currentLang();

    return isLanguageCode(currentLanguage)
      ? currentLanguage
      : this.defaultLanguage;
  }
}

export type LanguageCode = 'hu' | 'en' | 'de';

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === 'hu' || value === 'en' || value === 'de';
}
