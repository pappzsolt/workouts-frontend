import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly defaultLanguage = 'hu';

  constructor(private translate: TranslateService) {
    this.translate.setFallbackLang(this.defaultLanguage);

    const savedLanguage = localStorage.getItem('language');

    this.translate.use(savedLanguage || this.defaultLanguage);
  }

  setLanguage(language: 'hu' | 'en'): void {
    this.translate.use(language);
    localStorage.setItem('language', language);
  }

  getCurrentLanguage(): string {
    return this.translate.currentLang() || this.defaultLanguage;
  }
}
