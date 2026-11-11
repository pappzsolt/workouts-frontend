import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { combineLatest, filter, map, startWith } from 'rxjs';
import { LanguageCode, LanguageService } from './language.service';

const SITE = 'https://workouts.hevexora.com';
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/delete-account'] as const;
type AuthPath = typeof AUTH_PATHS[number];

const TEXT: Record<LanguageCode, { description: string; workspace: string; pages: Record<AuthPath, string>; descriptions: Record<AuthPath, string> }> = {
  hu: {
    description: 'Workouts: online edzéstervező és edzésnapló. Személyes edzésprogramok, sorozatok és fejlődés követése, edzői ügyfélkezelés.',
    workspace: 'Edzéstervező és edzésnapló',
    pages: { '/login': 'Bejelentkezés', '/register': 'Regisztráció', '/forgot-password': 'Elfelejtett jelszó',
      '/reset-password': 'Jelszó visszaállítása', '/delete-account': 'Fióktörlés kérése' },
    descriptions: {
      "/login": "Jelentkezz be a Workouts edzéstervezőbe és edzésnaplóba az edzésprogramjaid, sorozataid és fejlődési statisztikáid eléréséhez.",
      "/register": "Kérj felhasználói vagy edzői hozzáférést a Workouts edzéstervezőhöz. A fiók adminisztrátori jóváhagyás után jön létre.",
      "/forgot-password": "Elfelejtetted a Workouts-jelszavadat? Kérj jelszó-visszaállítási hivatkozást a fiókodhoz tartozó e-mail-címre.",
      "/reset-password": "Állíts be új jelszót a Workouts-fiókodhoz az e-mailben kapott, egyszer használható visszaállítási hivatkozással.",
      "/delete-account": "Ismerd meg a Workouts-fiók törlésének lépéseit, és küldj fióktörlési kérelmet a nyilvános űrlapon.",
    },
  },
  en: {
    description: 'Workouts: an online workout planner and training log. Organize personal training programs, record sets and progress, and manage coaching clients.',
    workspace: 'Workout planner and training log',
    pages: { '/login': 'Sign in', '/register': 'Registration', '/forgot-password': 'Forgot password',
      '/reset-password': 'Reset password', '/delete-account': 'Request account deletion' },
    descriptions: {
      "/login": "Sign in to the Workouts planner and training log to access your training programs, sets and progress statistics.",
      "/register": "Request user or coach access to Workouts. Your account is created after an administrator approves your registration.",
      "/forgot-password": "Forgot your Workouts password? Request a password-reset link using the email address associated with your account.",
      "/reset-password": "Choose a new password for your Workouts account using the one-time reset link sent to your email address.",
      "/delete-account": "Read how Workouts account deletion works and submit an account-deletion request using the public form.",
    },
  },
  de: {
    description: 'Workouts: Online-Trainingsplaner und Trainingstagebuch. Persönliche Trainingsprogramme, Sätze und Fortschritte dokumentieren und Trainingskunden betreuen.',
    workspace: 'Trainingsplaner und Trainingstagebuch',
    pages: { '/login': 'Anmelden', '/register': 'Registrierung', '/forgot-password': 'Passwort vergessen',
      '/reset-password': 'Passwort zurücksetzen', '/delete-account': 'Kontolöschung beantragen' },
    descriptions: {
      "/login": "Melde dich bei Workouts an, um deine Trainingsprogramme, Sätze und Fortschrittsstatistiken im Trainingstagebuch aufzurufen.",
      "/register": "Beantrage einen Benutzer- oder Trainerzugang zu Workouts. Dein Konto wird nach Freigabe durch einen Administrator erstellt.",
      "/forgot-password": "Workouts-Passwort vergessen? Fordere mit der E-Mail-Adresse deines Kontos einen Link zum Zurücksetzen an.",
      "/reset-password": "Lege mit dem einmaligen Link aus deiner E-Mail ein neues Passwort für dein Workouts-Konto fest.",
      "/delete-account": "Informiere dich über die Löschung deines Workouts-Kontos und sende eine Anfrage über das öffentliche Formular.",
    },
  },
};

/** Public discovery lives in /edzestervezo/. Application screens always stay out of search. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const navigation = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url),
    );
    combineLatest([navigation, this.language.language$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([url, language]) => this.update(url, language));
  }

  private update(url: string, language: LanguageCode): void {
    const path = url.split(/[?#]/)[0];
    const known = AUTH_PATHS.find(candidate => candidate === path);
    const text = TEXT[language];
    const title = `${known ? text.pages[known] : text.workspace} | Workouts`;
    const description = known ? text.descriptions[known] : text.description;
    this.document.documentElement.lang = language;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'noindex, follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:site_name', content: 'Workouts' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:locale', content: { hu: 'hu_HU', en: 'en_GB', de: 'de_DE' }[language] });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    // Never publish account IDs, password-reset tokens, query strings or fragments in metadata.
    this.document.head.querySelectorAll('link[rel="canonical"]').forEach(link => link.remove());
    this.meta.removeTag('property="og:url"');
    if (known) {
      const canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = SITE + known;
      this.document.head.appendChild(canonical);
      this.meta.updateTag({ property: 'og:url', content: SITE + known });
    }
  }
}
