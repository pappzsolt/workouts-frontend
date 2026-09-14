import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly defaultLanguage = 'hu';

  private readonly languageSubject = new BehaviorSubject<string>(this.defaultLanguage);

  public readonly language$: Observable<string> = this.languageSubject.asObservable();

  constructor(private translate: TranslateService) {
    this.translate.setFallbackLang(this.defaultLanguage);

    const savedLanguage = localStorage.getItem('language');

    const language = savedLanguage || this.defaultLanguage;

    this.translate.use(language);

    this.languageSubject.next(language);
  }

  setLanguage(language: 'hu' | 'en'): void {
    localStorage.setItem('language', language);

    this.translate.use(language);

    this.languageSubject.next(language);
  }

  getCurrentLanguage(): string {
    return this.translate.currentLang() || this.defaultLanguage;
  }
}
