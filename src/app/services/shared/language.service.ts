import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly defaultLanguage: LanguageCode = 'hu';
  private readonly languageSubject = new BehaviorSubject<LanguageCode>(this.defaultLanguage);
  public readonly language$: Observable<LanguageCode> = this.languageSubject.asObservable();
  private requestVersion = 0;
  loadFailed = false;

  constructor(private translate: TranslateService) {
    // Publish only languages activated by the translation loader. The subject
    // is also the synchronous source for every API request's language.
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ lang }) => {
      if (!isLanguageCode(lang)) return;
      localStorage.setItem('language', lang);
      this.loadFailed = false;
      if (this.languageSubject.value !== lang) this.languageSubject.next(lang);
    });
    this.translate.setFallbackLang(this.defaultLanguage);
    const savedLanguage = localStorage.getItem('language');
    this.setLanguage(isLanguageCode(savedLanguage) ? savedLanguage : this.defaultLanguage);
  }

  setLanguage(language: LanguageCode): void {
    const version = ++this.requestVersion;
    this.loadFailed = false;
    this.translate.use(language).pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {
        if (version === this.requestVersion) this.loadFailed = true;
      },
    });
  }

  getCurrentLanguage(): LanguageCode {
    return this.languageSubject.value;
  }
}

export type LanguageCode = 'hu' | 'en' | 'de';

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === 'hu' || value === 'en' || value === 'de';
}
