import { Injectable, inject, signal } from '@angular/core';
import { LanguageService, type LanguageCode } from './language.service';

export type GuideRole = 'user' | 'coach';

interface LocalizedStep {
  title: string;
  description: string;
}

export interface GuideStep {
  route: string;
  target: string;
  text: Record<LanguageCode, LocalizedStep>;
}

export interface GuideSession {
  role: GuideRole;
  userId: number | null;
  index: number;
}

const STORAGE_VERSION = 'v1';
const STORAGE_PREFIX = `workouts-guided-tour:${STORAGE_VERSION}`;

/** Only existing guarded routes are used; the guide never mutates workout data. */
export const GUIDE_STEPS: Record<GuideRole, readonly GuideStep[]> = {
  user: [
    {
      route: '/user/dashboard', target: '[data-guide="user-dashboard"]',
      text: {
        hu: { title: 'Itt kezdődik az edzésed', description: 'A kezdőoldalon találod az edzéseid, a saját programjaid és a fejlődési statisztikáid gyors elérését. Válaszd ki, mit szeretnél csinálni.' },
        en: { title: 'Your workout starts here', description: 'Your dashboard links to workouts, your programs and your progress statistics. Choose what you want to do next.' },
        de: { title: 'Hier beginnt dein Training', description: 'Im Dashboard findest du deine Trainings, Programme und Fortschrittsstatistiken. Wähle aus, was du als Nächstes tun möchtest.' },
      },
    },
    {
      route: '/user/my-programs', target: '[data-guide="user-programs"]',
      text: {
        hu: { title: 'Edzésprogramjaid', description: 'Itt nyithatod meg az edződtől kapott vagy saját programjaidat. Egy programot kiválasztva megnézheted a benne szereplő edzéseket. Ha még nincs programod, kérj az edződtől, vagy hozz létre sajátot.' },
        en: { title: 'Your training programs', description: 'Open a program assigned by your coach or one you created yourself. Choose a program to view its workouts. If you have none yet, ask your coach or create one.' },
        de: { title: 'Deine Trainingsprogramme', description: 'Öffne ein zugewiesenes oder selbst erstelltes Programm, um die Trainings zu sehen. Falls du noch keines hast, frage deinen Coach oder erstelle eines.' },
      },
    },
    {
      route: '/user/workouts', target: '[data-guide="user-calendar"]',
      text: {
        hu: { title: 'Edzésnaptár és teljesítés', description: 'Válaszd ki a naptárban az edzésnapot, majd nyisd meg az edzést és a gyakorlatot. A sorozatnál add meg a tényleges súlyt és ismétléseket, majd jelöld teljesítettnek. A pihenőidőzítő segít a következő sorozatig.' },
        en: { title: 'Calendar and logging sets', description: 'Choose a day in the calendar, open the workout and then the exercise. Enter the weight and repetitions you actually performed, and mark the set complete. Use the rest timer between sets.' },
        de: { title: 'Kalender und Sätze erfassen', description: 'Wähle einen Tag und öffne Training und Übung. Trage dein tatsächlich bewegtes Gewicht und die Wiederholungen ein und markiere den Satz als erledigt. Der Pausentimer hilft zwischen den Sätzen.' },
      },
    },
    {
      route: '/user/program-statistics', target: '[data-guide="user-statistics"]',
      text: {
        hu: { title: 'Kövesd a fejlődésedet', description: 'Itt láthatod a teljesített edzéseket, a heti volument és az erőfejlődést. A becsült 1RM nem tényleges maxolás: a rögzített súlyból és ismétlésekből számított becslés.' },
        en: { title: 'Track your progress', description: 'Review completed workouts, weekly volume and strength progress. Estimated 1RM is calculated from logged weight and reps; it is not a measured maximum lift.' },
        de: { title: 'Verfolge deinen Fortschritt', description: 'Hier siehst du absolvierte Trainings, Wochenvolumen und Kraftentwicklung. Das geschätzte 1RM wird aus Gewicht und Wiederholungen berechnet und ist kein tatsächlich gemessener Maximalversuch.' },
      },
    },
    {
      route: '/user/profile', target: '[data-guide="user-profile"]',
      text: {
        hu: { title: 'Saját adataid és segítség', description: 'A profilodnál ellenőrizheted a fiókadataidat. Ha később újra szeretnéd végignézni ezt a bemutatót, az oldalsó menü „Felhasználói útmutató” pontjából bármikor elindíthatod.' },
        en: { title: 'Profile and help', description: 'Review your account details here. You can restart this tour at any time from “User guide” in the side menu.' },
        de: { title: 'Profil und Hilfe', description: 'Hier kannst du deine Kontodaten ansehen. Du kannst diese Einführung jederzeit über „Benutzeranleitung“ im Seitenmenü neu starten.' },
      },
    },
  ],
  coach: [
    {
      route: '/coach/dashboard', target: '[data-guide="coach-dashboard"]',
      text: {
        hu: { title: 'Edzői áttekintés', description: 'Itt látod a mai edzéseket, a figyelmet igénylő sportolókat és az aktív programokat. Innen gyorsan elérhető a programlétrehozás és a sportolók kezelése.' },
        en: { title: 'Coach overview', description: 'See today’s workouts, athletes needing attention and active programs. You can also jump to creating a program or managing clients.' },
        de: { title: 'Coach-Übersicht', description: 'Hier siehst du heutige Trainings, Sportler mit Handlungsbedarf und aktive Programme. Du kannst auch direkt Programme erstellen oder Klienten verwalten.' },
      },
    },
    {
      route: '/coach/clients', target: '[data-guide="coach-clients"]',
      text: {
        hu: { title: 'Sportolók kezelése', description: 'Itt kereshetsz sportolót. Nyisd meg az adatlapját, hogy átnézd az edzéseit, és a sportoló részletes oldalán rendelj hozzá edzésprogramot.' },
        en: { title: 'Manage your clients', description: 'Find an athlete here. Open their details to review training and assign a program from their detail page.' },
        de: { title: 'Klienten verwalten', description: 'Hier findest du Sportler. Öffne ihre Detailseite, um Trainings anzusehen und ein Programm zuzuweisen.' },
      },
    },
    {
      route: '/coach/programs', target: '[data-guide="coach-programs"]',
      text: {
        hu: { title: 'Programok létrehozása', description: 'Az „Új program” gombbal összeállíthatsz egy programot, és edzéseket rendelhetsz hozzá. Meglévő programot is megnyithatsz szerkesztésre, vagy importálhatsz.' },
        en: { title: 'Create a training program', description: 'Use “New program” to build a program and add workouts. You can also edit an existing program or import one.' },
        de: { title: 'Trainingsprogramme erstellen', description: 'Mit „Neues Programm” erstellst du einen Plan und ordnest Trainings zu. Du kannst auch Programme bearbeiten oder importieren.' },
      },
    },
    {
      route: '/coach/workouts', target: '[data-guide="coach-workouts"]',
      text: {
        hu: { title: 'Edzések és sablonok', description: 'Az edzések listájában megnyithatod és módosíthatod az edzéseket. A gyakorlatok, sorozatok és célértékek beállítása után a programodban is felhasználhatod őket.' },
        en: { title: 'Workouts and templates', description: 'Open and edit workouts from this list. Configure exercises, sets and target values, then reuse workouts in your training programs.' },
        de: { title: 'Trainings und Vorlagen', description: 'Hier kannst du Trainings öffnen und bearbeiten. Lege Übungen, Sätze und Zielwerte fest und verwende die Trainings in deinen Programmen.' },
      },
    },
    {
      route: '/coach/exercises', target: '[data-guide="coach-exercises"]',
      text: {
        hu: { title: 'Gyakorlatkönyvtár és későbbi segítség', description: 'A gyakorlatok között kereshetsz, szűrhetsz és szerkeszthetsz. A teljes bemutatót bármikor újraindíthatod az oldalsó menü „Edzői útmutató” pontjából.' },
        en: { title: 'Exercise library and help', description: 'Search, filter and edit the exercise library. Restart this tour whenever you need it from “Coach guide” in the side menu.' },
        de: { title: 'Übungsbibliothek und Hilfe', description: 'Du kannst Übungen suchen, filtern und bearbeiten. Diese Einführung kannst du jederzeit über „Coach-Anleitung“ im Seitenmenü neu starten.' },
      },
    },
  ],
};

export const GUIDE_UI: Record<LanguageCode, {
  helpUser: string; helpCoach: string; skip: string; previous: string;
  next: string; finish: string; step: string; description: string; note: string;
}> = {
  hu: {
    helpUser: 'Felhasználói útmutató', helpCoach: 'Edzői útmutató', skip: 'Kihagyás',
    previous: 'Vissza', next: 'Következő', finish: 'Befejezés', step: 'lépés',
    description: 'Interaktív alkalmazásbemutató', note: 'A kiemelt rész az aktuális képernyőn található. A bemutató nem módosít edzésadatokat.',
  },
  en: {
    helpUser: 'User guide', helpCoach: 'Coach guide', skip: 'Skip',
    previous: 'Back', next: 'Next', finish: 'Finish', step: 'step',
    description: 'Interactive app tour', note: 'The highlighted area is on the current screen. This tour does not change your training data.',
  },
  de: {
    helpUser: 'Benutzeranleitung', helpCoach: 'Coach-Anleitung', skip: 'Überspringen',
    previous: 'Zurück', next: 'Weiter', finish: 'Fertig', step: 'Schritt',
    description: 'Interaktive Einführung', note: 'Der markierte Bereich befindet sich auf dieser Seite. Diese Einführung verändert keine Trainingsdaten.',
  },
};

@Injectable({ providedIn: 'root' })
export class GuidedTourService {
  private readonly language = inject(LanguageService);
  readonly active = signal<GuideSession | null>(null);

  get labels() {
    return GUIDE_UI[this.language.getCurrentLanguage()];
  }

  get languageCode(): LanguageCode {
    return this.language.getCurrentLanguage();
  }

  /** Offer only once per account, role and tour version on this browser. */
  offerFirstVisit(role: GuideRole, userId: number | null): void {
    const key = this.storageKey(role, userId);
    if (key && this.read(key) === 'done') return;
    this.start(role, userId);
  }

  /** The side-menu entry can restart the guide even after completion. */
  start(role: GuideRole, userId: number | null): void {
    this.active.set({ role, userId, index: 0 });
  }

  next(): void {
    this.active.update(state => state && state.index < GUIDE_STEPS[state.role].length - 1
      ? { ...state, index: state.index + 1 } : state);
  }

  previous(): void {
    this.active.update(state => state && state.index > 0
      ? { ...state, index: state.index - 1 } : state);
  }

  /** Skip and Finish both count as having seen the first-login offer. */
  dismiss(): void {
    const state = this.active();
    if (!state) return;
    const key = this.storageKey(state.role, state.userId);
    if (key) {
      try { localStorage.setItem(key, 'done'); } catch { /* Private mode: tour remains usable. */ }
    }
    this.active.set(null);
  }

  /** Do not mark a tour as seen merely because the account logged out. */
  resetOnLogout(): void {
    this.active.set(null);
  }

  private storageKey(role: GuideRole, userId: number | null): string | null {
    if (userId === null || !Number.isSafeInteger(userId)) return null;
    return `${STORAGE_PREFIX}:${role}:${userId}`;
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
}
