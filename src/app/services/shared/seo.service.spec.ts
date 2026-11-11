import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { LanguageCode, LanguageService } from './language.service';
import { SeoService } from './seo.service';

describe('Application search metadata', () => {
  let page: Document;
  let navigation: Subject<NavigationEnd>;
  let language: BehaviorSubject<LanguageCode>;
  const meta = (selector: string) => page.head.querySelector<HTMLMetaElement>(selector)?.content;
  const go = (url: string) => navigation.next(new NavigationEnd(1, url, url));

  beforeEach(() => {
    page = document.implementation.createHTMLDocument();
    navigation = new Subject();
    language = new BehaviorSubject<LanguageCode>('hu');
    TestBed.configureTestingModule({ providers: [
      { provide: DOCUMENT, useValue: page }, Meta, Title,
      { provide: Router, useValue: { url: '/login', events: navigation } },
      { provide: LanguageService, useValue: { language$: language } },
    ] });
    TestBed.inject(SeoService);
  });

  it('sets a localized title, description and noindex on the initial login page', () => {
    expect(page.title).toBe('Bejelentkezés | Workouts');
    expect(meta('meta[name="description"]')).toContain('Jelentkezz be');
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
    expect(page.documentElement.lang).toBe('hu');
    expect(page.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href)
      .toBe('https://workouts.hevexora.com/login');
  });

  it('updates page-specific metadata and never duplicates tags on navigation', () => {
    for (const url of ['/register', '/login', '/register']) go(url);
    expect(page.title).toBe('Regisztráció | Workouts');
    expect(meta('meta[name="description"]')).toContain('jóváhagyás');
    expect(meta('meta[property="og:title"]')).toBe(page.title);
    for (const selector of ['link[rel="canonical"]', 'meta[name="robots"]',
      'meta[name="description"]', 'meta[property="og:url"]']) {
      expect(page.head.querySelectorAll(selector).length).withContext(selector).toBe(1);
    }
  });

  it('changes the document language and metadata when the active UI language changes', () => {
    go('/register'); language.next('en');
    expect(page.title).toBe('Registration | Workouts');
    expect(page.documentElement.lang).toBe('en');
    expect(meta('meta[property="og:locale"]')).toBe('en_GB');
    language.next('de');
    expect(page.title).toBe('Registrierung | Workouts');
    expect(page.documentElement.lang).toBe('de');
    expect(meta('meta[name="description"]')).toContain('Administrator');
  });

  it('strips reset tokens, query strings and fragments from canonical and social URLs', () => {
    go('/reset-password?token=do-not-publish#private-fragment');
    expect(page.title).toBe('Jelszó visszaállítása | Workouts');
    expect(meta('meta[property="og:url"]')).toBe('https://workouts.hevexora.com/reset-password');
    expect(page.head.innerHTML).not.toContain('do-not-publish');
    expect(page.head.innerHTML).not.toContain('private-fragment');
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('keeps private and unknown routes out of search without publishing account identifiers', () => {
    for (const url of ['/admin/users/edit?userId=999123', '/coach/clients/999123', '/user/profile', '/unknown']) {
      go(url);
      expect(meta('meta[name="robots"]')).toBe('noindex, follow');
      expect(page.head.querySelector('link[rel="canonical"]')).toBeNull();
      expect(meta('meta[property="og:url"]')).toBeUndefined();
      expect(page.head.innerHTML).not.toContain('999123');
    }
    go('/login');
    expect(page.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });
});
