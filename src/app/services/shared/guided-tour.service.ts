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
      route: '/user/dashboard',
      target: '[data-guide="user-dashboard"]',
      text: {
        hu: {
          title: 'Itt kezdődik az edzésed',
          description:
            'A kezdőoldal hat kártyája az edzéssablonokhoz, az új önálló edzéshez, a saját programokhoz, az edzésprogramjaidhoz, a statisztikához és az edzésnaptárhoz vezet. A program több edzésnap terve; az önálló edzés egyetlen alkalom. Először válassz tervet vagy hozz létre sajátot, majd a naptárból nyisd meg az aktuális edzést.',
        },
        en: {
          title: 'Your workout starts here',
          description:
            'The six dashboard cards open workout templates, a new standalone workout, personal programs, assigned programs, statistics and the workout calendar. A program plans several training days; a standalone workout is one session. Choose a plan or create your own, then open your scheduled session from the calendar.',
        },
        de: {
          title: 'Hier beginnt dein Training',
          description:
            'Die sechs Kacheln führen zu Trainingsvorlagen, einem neuen Einzeltraining, eigenen Programmen, zugewiesenen Programmen, Statistiken und dem Trainingskalender. Ein Programm plant mehrere Trainingstage; ein Einzeltraining ist ein Termin. Wähle einen Plan oder erstelle einen eigenen und öffne dein aktuelles Training im Kalender.',
        },
      },
    },
    {
      route: '/user/my-programs',
      target: '[data-guide="user-programs"]',
      text: {
        hu: {
          title: 'Edzésprogramjaid',
          description:
            'Itt találod az edződtől kapott és a már elindított saját programokat. A programkártyát megnyitva jutsz az edzésekhez, onnan a gyakorlatokhoz és sorozatokhoz. A haladás a rögzített teljesítésekből áll össze: a program vagy egy edzés megnyitása önmagában nem számít elvégzett edzésnek. A keresés és a lapozás segít több program között eligazodni.',
        },
        en: {
          title: 'Your training programs',
          description:
            'Find coach-assigned programs and your started personal programs here. Open a program card to see its workouts, then its exercises and sets. Progress comes from recorded completion: opening a program or workout does not complete it. Search and pagination help you find the right plan.',
        },
        de: {
          title: 'Deine Trainingsprogramme',
          description:
            'Hier findest du zugewiesene und bereits gestartete eigene Programme. Öffne eine Programmkarte, dann das Training, die Übung und die Sätze. Der Fortschritt entsteht aus erfassten Abschlüssen: Das Öffnen eines Programms oder Trainings gilt noch nicht als absolviertes Training. Suche und Seitenwechsel helfen bei mehreren Programmen.',
        },
      },
    },
    {
      route: '/user/personal-programs',
      target: 'app-personal-programs h1',
      text: {
        hu: {
          title: 'Saját programok: tervből edzés',
          description:
            'Itt a saját terveidet és önálló edzéseidet kezelheted; a típusválasztóval külön is szűrheted őket. Új programnál add meg az időtartamot, az edzésnapokat és a gyakorlatokat. A mentés piszkozatot őriz meg, az indítás hozza létre a végezhető edzéseket. Az elindított terv szerkezete zárolt; új változathoz készíts másolatot, így a korábbi eredmények megmaradnak.',
        },
        en: {
          title: 'Personal programs: from plan to training',
          description:
            'Manage your own plans and standalone workouts here, using the type filter to separate them. A new program needs its duration, training days and exercises. Saving keeps a draft; starting creates sessions you can perform. A started plan has a locked structure. Copy it for a new version while keeping earlier results.',
        },
        de: {
          title: 'Eigene Programme: vom Plan zum Training',
          description:
            'Hier verwaltest du eigene Pläne und Einzeltrainings und filterst nach Typ. Lege für ein Programm Dauer, Trainingstage und Übungen fest. Speichern bewahrt den Entwurf; Starten erzeugt ausführbare Trainings. Die Struktur gestarteter Pläne ist gesperrt. Erstelle für Änderungen eine Kopie, damit bisherige Ergebnisse erhalten bleiben.',
        },
      },
    },
    {
      route: '/user/personal-workouts/new',
      target: 'app-personal-program-editor form',
      text: {
        hu: {
          title: 'Új önálló edzés',
          description:
            'Egyetlen edzéshez nem kell többnapos programot összeállítanod. Adj nevet, válassz dátumot és gyakorlatokat, majd állítsd be a sorozatokat, ismétléseket és pihenőt. Előbb mentsd el, utána indítsd el. Egy már elindított önálló edzés új alkalma külön eredményeket kap: a következő edzés nem írja felül az előző teljesítését.',
        },
        en: {
          title: 'Create a standalone workout',
          description:
            'You do not need a multi-day program for one workout. Enter a name, choose a date and exercises, and set the sets, repetitions and rest. Save before starting it. A new occurrence of a started standalone workout has separate results, so the next session does not overwrite the previous performance.',
        },
        de: {
          title: 'Ein neues Einzeltraining',
          description:
            'Für ein einzelnes Training brauchst du keinen mehrtägigen Plan. Gib einen Namen ein, wähle Datum und Übungen und lege Sätze, Wiederholungen und Pausen fest. Speichere vor dem Start. Ein neuer Termin eines gestarteten Einzeltrainings erhält eigene Ergebnisse und überschreibt die vorherige Leistung nicht.',
        },
      },
    },
    {
      route: '/user/workout-templates',
      target: 'app-workout-templates h1',
      text: {
        hu: {
          title: 'Edzéssablonok és kedvencek',
          description:
            'A sablon újra felhasználható edzésterv, nem egy korábbi edzés eredménylapja. Az elmentett önálló edzésből készíthetsz sablont; itt keresheted és kedvencnek jelölheted. Felhasználásakor új önálló edzés készül, amelynek dátumát beállíthatod és elindíthatod. A sablon törlése a sablont távolítja el, nem a belőle korábban elvégzett edzések eredményeit.',
        },
        en: {
          title: 'Workout templates and favorites',
          description:
            'A template is a reusable workout plan, not a past session’s result sheet. Save a standalone workout as a template, then search or favorite it here. Using it creates a new standalone workout whose date you can set before starting. Deleting a template removes the template, not results from sessions already performed.',
        },
        de: {
          title: 'Trainingsvorlagen und Favoriten',
          description:
            'Eine Vorlage ist ein wiederverwendbarer Trainingsplan, kein Ergebnisblatt eines früheren Trainings. Speichere ein Einzeltraining als Vorlage und suche oder favorisiere es hier. Die Verwendung erstellt ein neues Einzeltraining mit eigenem Datum und Start. Das Löschen einer Vorlage entfernt keine Ergebnisse bereits absolvierter Trainings.',
        },
      },
    },
    {
      route: '/user/personal-programs/import',
      target: 'app-program-import h1',
      text: {
        hu: {
          title: 'Program importálása Excelből',
          description:
            'Az importálás egy fájlból hoz létre saját programot. Válassz .xlsx fájlt, és először futtasd az előellenőrzést. Nézd át a figyelmeztetéseket, az ismeretlen vagy többféleképpen azonosítható gyakorlatokat pedig párosítsd a gyakorlatkönyvtárral. Az előnézet még nem végleges mentés: az ellenőrzés után külön importálj, majd a létrejött tervet ellenőrizd és indítsd el.',
        },
        en: {
          title: 'Import a program from Excel',
          description:
            'Import creates a personal program from a file. Choose an .xlsx file and run the preview first. Review warnings and match unknown or ambiguous exercise names to the exercise library. Previewing does not save the final program. Import after checking, then review and start the resulting plan.',
        },
        de: {
          title: 'Ein Programm aus Excel importieren',
          description:
            'Der Import erstellt ein eigenes Programm aus einer Datei. Wähle eine .xlsx-Datei und prüfe zuerst die Vorschau. Beachte Warnungen und ordne unbekannte oder mehrdeutige Übungsnamen der Bibliothek zu. Die Vorschau speichert noch kein endgültiges Programm. Importiere nach der Prüfung und kontrolliere und starte anschließend den Plan.',
        },
      },
    },
    {
      route: '/user/workouts',
      target: '[data-guide="user-calendar"]',
      text: {
        hu: {
          title: 'Edzésnaptár: melyik alkalmat végzed?',
          description:
            'A naptárban válaszd ki a napot, majd az ahhoz tartozó edzést. Ugyanaz a gyakorlatsor több napon is szerepelhet, de minden edzésalkalom saját teljesítési adatokkal rendelkezik. Mindig a megfelelő dátumot nyisd meg, hogy a mai súlyok és ismétlések a mai edzéshez kerüljenek. A hónapváltóval a korábbi és a későbbi napokat is megtalálod.',
        },
        en: {
          title: 'Calendar: choose the right session',
          description:
            'Choose a day and its workout in the calendar. The same exercise routine may appear on several dates, but each session has its own performance records. Open the correct date so today’s weights and repetitions belong to today’s workout. Use the month controls to find past or upcoming sessions.',
        },
        de: {
          title: 'Kalender: den richtigen Termin wählen',
          description:
            'Wähle einen Tag und das dazugehörige Training. Dieselbe Übungsfolge kann an mehreren Tagen vorkommen, doch jeder Termin hat eigene Leistungsdaten. Öffne das richtige Datum, damit heutige Gewichte und Wiederholungen dem heutigen Training zugeordnet werden. Über den Monatswechsel findest du vergangene und zukünftige Termine.',
        },
      },
    },
    {
      route: '/user/workouts',
      target: '[data-guide="user-calendar"]',
      text: {
        hu: {
          title: 'Sorozatok, célértékek és teljesítés',
          description:
            'Az edzésen belül nyisd meg a gyakorlatot. A célismétlés, célsúly és pihenő azt mutatja, mi a terv; a tényleges súlyhoz és ismétléshez az elvégzett teljesítményt írd. Jelöld késznek a befejezett sorozatot, és használd a pihenőidőzítőt. A korábbi eredmények összehasonlítást adnak, nem jelentik a mostani sorozat teljesítését. A program haladása a rögzített edzésadatokat követi.',
        },
        en: {
          title: 'Sets, targets and completion',
          description:
            'Open an exercise within the workout. Target repetitions, weight and rest describe the plan; actual weight and repetitions record what you performed. Mark each finished set complete and use the rest timer. Previous results are a reference, not completion of the current set. Program progress follows your recorded training data.',
        },
        de: {
          title: 'Sätze, Zielwerte und Abschluss',
          description:
            'Öffne eine Übung im Training. Zielwiederholungen, Zielgewicht und Pause beschreiben den Plan; tatsächliches Gewicht und Wiederholungen erfassen deine Leistung. Markiere erledigte Sätze und nutze den Pausentimer. Frühere Ergebnisse dienen dem Vergleich und schließen den aktuellen Satz nicht ab. Der Programmfortschritt folgt den erfassten Trainingsdaten.',
        },
      },
    },
    {
      route: '/user/program-statistics',
      target: '[data-guide="user-statistics"]',
      text: {
        hu: {
          title: 'Kövesd a fejlődésedet',
          description:
            'A programok között lapozva a nézet az edzésaktivitást, a heti volument és a gyakorlatok erőfejlődését mutatja. A statisztika a rögzített teljesítményből készül, ezért a hiányzó adatok hiányos képet adnak. A becsült 1RM a súlyból és ismétlésekből számított érték, nem ténylegesen kipróbált maximális súly.',
        },
        en: {
          title: 'Track your progress',
          description:
            'Page through your programs to review activity, weekly volume and exercise strength progress. Statistics use recorded performance, so missing records leave gaps. Estimated 1RM is calculated from logged weight and repetitions; it is not a maximum weight you have actually tested.',
        },
        de: {
          title: 'Verfolge deinen Fortschritt',
          description:
            'Blättere durch deine Programme, um Trainingsaktivität, Wochenvolumen und Kraftentwicklung zu sehen. Die Statistik verwendet erfasste Leistungen; fehlende Einträge führen zu Lücken. Das geschätzte 1RM wird aus Gewicht und Wiederholungen berechnet und ist kein tatsächlich getestetes Maximalgewicht.',
        },
      },
    },
    {
      route: '/user/profile',
      target: '[data-guide="user-profile"]',
      text: {
        hu: {
          title: 'Profil: a fiókod és személyes adataid',
          description:
            'A Profil menüpontban ellenőrizheted és módosíthatod a fiókhoz tartozó adataidat, például az e-mail-címedet és a kitölthető személyes mezőket. A változtatásokat a mentés gombbal rögzítsd, és figyeld a visszajelzést. A profil adatainak módosítása külön művelet az edzésnapló vezetésétől: ettől még nem lesz elvégzett egy edzés.',
        },
        en: {
          title: 'Profile: account and personal details',
          description:
            'Use Profile to review and edit account details such as your email address and available personal fields. Save your changes and check the confirmation. Updating your profile is separate from logging training: it does not complete any workout.',
        },
        de: {
          title: 'Profil: Konto und persönliche Angaben',
          description:
            'Im Profil prüfst und bearbeitest du Kontodaten wie deine E-Mail-Adresse und die verfügbaren persönlichen Felder. Speichere Änderungen und beachte die Rückmeldung. Profiländerungen sind vom Trainingstagebuch getrennt und schließen kein Training ab.',
        },
      },
    },
    {
      route: '/user/bug-report',
      target: 'app-bug-report h2',
      text: {
        hu: {
          title: 'Hibabejelentés: segíts a hiba azonosításában',
          description:
            'Ha valami nem működik, adj rövid címet, majd írd le, melyik oldalon milyen lépések után mi történt, és mit vártál helyette. Képernyőképet is csatolhatsz. A sikeres beküldés után kapott azonosító a bejelentést jelöli, nem a hiba kijavítását. Jelszót és más belépési titkot ne írj a leírásba.',
        },
        en: {
          title: 'Bug report: make the problem reproducible',
          description:
            'Give the issue a short title, then describe the page, the steps you took, what happened and what you expected. You can attach screenshots. A successful submission returns a report ID; it confirms receipt, not that the issue is fixed. Do not include passwords or other sign-in secrets.',
        },
        de: {
          title: 'Fehler melden: das Problem nachvollziehbar machen',
          description:
            'Gib einen kurzen Titel an und beschreibe die Seite, deine Schritte, das Ergebnis und das erwartete Verhalten. Du kannst Bildschirmbilder anhängen. Die Meldungsnummer bestätigt den Eingang, nicht die Behebung. Trage keine Passwörter oder anderen Anmeldegeheimnisse ein.',
        },
      },
    },
    {
      route: '/user/profile',
      target: '[data-guide="user-profile"]',
      text: {
        hu: {
          title: 'Fiók törlése: kérelem és feldolgozás',
          description:
            'A Fiók törlése menüpont külön, nyilvános űrlapot nyit. Ott a fiók e-mail-címével, a szükséges hozzájárulással és CAPTCHA-ellenőrzéssel küldhetsz törlési kérelmet. A sikerüzenet a kérelem átvételét igazolja: a fiók nem azonnal törlődik. A feldolgozás és az adatmegőrzés részleteit az űrlap tájékoztatója ismerteti.',
        },
        en: {
          title: 'Delete account: request and processing',
          description:
            'The Delete account menu item opens a separate public form. Submit a deletion request using the account email, the required consent and CAPTCHA verification. Success confirms receipt of the request; the account is not deleted immediately. The form explains processing and data retention.',
        },
        de: {
          title: 'Konto löschen: Antrag und Bearbeitung',
          description:
            'Der Menüpunkt Konto löschen öffnet ein separates öffentliches Formular. Mit Konto-E-Mail-Adresse, erforderlicher Zustimmung und CAPTCHA kannst du einen Löschantrag senden. Die Bestätigung bedeutet den Eingang des Antrags, nicht die sofortige Löschung. Informationen zur Bearbeitung und Aufbewahrung stehen im Formular.',
        },
      },
    },
    {
      route: '/user/dashboard',
      target: 'app-layout header',
      text: {
        hu: {
          title: 'Navigáció, nyelvváltás és kijelentkezés',
          description:
            'Mobilon a fejléc menügombja nyitja az oldalsó menüt; az oldal tetején lévő navigációs útvonal a szülőoldalra segít visszalépni. A fejlécben magyar, angol és német nyelv választható. A Kijelentkezés gomb lezárja a munkamenetet: előtte ellenőrizd a mentéseidet. Ezt a bemutatót bármikor újraindíthatod az oldalsó menü Felhasználói útmutató pontjából.',
        },
        en: {
          title: 'Navigation, language and signing out',
          description:
            'On mobile, the header menu button opens the side menu. Breadcrumbs above the page lead back to parent pages. Choose Hungarian, English or German in the header. Sign out ends your session, so check your saved changes first. Restart this tour any time from User guide in the side menu.',
        },
        de: {
          title: 'Navigation, Sprache und Abmelden',
          description:
            'Auf Mobilgeräten öffnet die Menütaste in der Kopfzeile das Seitenmenü. Der Navigationspfad führt zu übergeordneten Seiten zurück. In der Kopfzeile wählst du Ungarisch, Englisch oder Deutsch. Abmelden beendet die Sitzung; prüfe vorher deine gespeicherten Änderungen. Über Benutzeranleitung im Seitenmenü startest du diese Einführung jederzeit erneut.',
        },
      },
    },
  ],
  coach: [
    {
      route: '/coach/dashboard',
      target: '[data-guide="coach-dashboard"]',
      text: {
        hu: {
          title: 'Edzői áttekintés',
          description:
            'Az Áttekintés a mai edzéseket, a figyelmet igénylő sportolókat és az aktív programokat foglalja össze. Egy program a közös edzésstruktúra; kiosztáskor a sportolók saját edzésalkalmakat kapnak. A napi edzés vagy a sportoló megnyitásával az egyéni teljesítéshez jutsz. A program létrehozása önmagában még nem jelent kiosztást vagy teljesített edzést.',
        },
        en: {
          title: 'Coach overview',
          description:
            'Overview brings together today’s workouts, athletes needing attention and active programs. A program defines the shared workout structure; assignment gives athletes their own sessions. Open a workout or athlete to inspect individual performance. Creating a program alone does not assign it or complete any workout.',
        },
        de: {
          title: 'Coach-Übersicht',
          description:
            'Die Übersicht zeigt heutige Trainings, Sportler mit Handlungsbedarf und aktive Programme. Ein Programm legt die gemeinsame Trainingsstruktur fest; durch Zuweisung erhalten Sportler eigene Termine. Öffne ein Training oder einen Sportler für individuelle Leistungen. Das Erstellen eines Programms bedeutet noch keine Zuweisung oder abgeschlossene Einheit.',
        },
      },
    },
    {
      route: '/coach/calendar',
      target: 'app-coach-calendar h1',
      text: {
        hu: {
          title: 'Edzői naptár: ki és mikor edz?',
          description:
            'A naptárban minden sportolót együtt vagy egy kiválasztott ügyfelet láthatsz. Válts hónapot, térj vissza a mai napra, majd válassz dátumot az aznapi edzésekhez. Innen a sportoló adott edzésére léphetsz. A közös programnap és az egyéni edzésidőpont külön fogalom: az egyéni átütemezést a sportoló saját edzésénél kezeld.',
        },
        en: {
          title: 'Coach calendar: who trains when?',
          description:
            'View all athletes or filter to one client. Change months, return to today and choose a date to inspect its sessions. Open an athlete’s specific workout from there. A shared program day and an individual scheduled date are different: manage personal rescheduling on the athlete’s own session.',
        },
        de: {
          title: 'Coach-Kalender: wer trainiert wann?',
          description:
            'Zeige alle Sportler oder filtere nach einem Klienten. Wechsle den Monat, kehre zu heute zurück und wähle ein Datum für die zugehörigen Trainings. Von dort öffnest du den konkreten Termin. Gemeinsamer Programmtag und individuelles Trainingsdatum sind verschieden; persönliche Verschiebungen verwaltest du am Training des Sportlers.',
        },
      },
    },
    {
      route: '/coach/clients',
      target: '[data-guide="coach-clients"]',
      text: {
        hu: {
          title: 'Sportolók és egyéni edzésadatok',
          description:
            'Az Ügyfelek között név, e-mail vagy program alapján kereshetsz. A sportoló adatlapján a Programok és Edzésterv nézetekből eléred a kiosztásokat és az edzésalkalmakat. A célértékeket és a tényleges teljesítményt a kiválasztott sportoló adott sorozatánál kezeld, majd ments. Ezek egyéni adatok: egy sportoló súlyának módosítása nem a közös gyakorlatlista átírása.',
        },
        en: {
          title: 'Clients and individual training data',
          description:
            'Search Clients by name, email or program. On an athlete’s detail page, Programs and Training plan give access to assignments and sessions. Edit targets and actual performance on the selected athlete’s specific set, then save. These are individual records: changing one athlete’s weight is not editing the shared exercise list.',
        },
        de: {
          title: 'Klienten und individuelle Trainingsdaten',
          description:
            'Suche nach Name, E-Mail oder Programm. Auf der Detailseite führen Programme und Trainingsplan zu Zuweisungen und Terminen. Bearbeite Zielwerte und tatsächliche Leistungen am konkreten Satz des gewählten Sportlers und speichere. Diese Daten sind individuell: Ein anderes Gewicht für einen Sportler ändert nicht die gemeinsame Übungsliste.',
        },
      },
    },
    {
      route: '/coach/programs',
      target: '[data-guide="coach-programs"]',
      text: {
        hu: {
          title: 'Programok: közös terv és kiosztás',
          description:
            'A Programok között kereshetsz, szűrhetsz és megnyithatsz meglévő terveket, vagy újat hozhatsz létre. A program az edzésnapokat és a közös gyakorlatlistákat fogja össze; a sportolók külön kiosztással kapják meg. Másolással új tervváltozatot készíthetsz. A program szerkezetét és az egyes sportolók már rögzített eredményeit külön kezeld.',
        },
        en: {
          title: 'Programs: shared plans and assignments',
          description:
            'Search, filter and open existing plans or create one. A program brings together training days and shared exercise lists; athletes receive it through assignment. Copy a program to create a new version. Keep changes to the shared structure distinct from an athlete’s already recorded results.',
        },
        de: {
          title: 'Programme: gemeinsame Pläne und Zuweisung',
          description:
            'Suche, filtere und öffne bestehende Pläne oder erstelle einen neuen. Ein Programm verbindet Trainingstage und gemeinsame Übungslisten; Sportler erhalten es durch Zuweisung. Eine Kopie erzeugt eine neue Planversion. Unterscheide Änderungen an der gemeinsamen Struktur von bereits erfassten individuellen Ergebnissen.',
        },
      },
    },
    {
      route: '/coach/programs/new',
      target: 'app-program-details-form section',
      text: {
        hu: {
          title: 'Programtervező: Edzések, Naptár, Ügyfelek',
          description:
            'Először add meg a nevet, kezdődátumot, időtartamot és nehézséget, majd hozd létre a programot. Utána az Edzések fülön válassz napot, adj hozzá új vagy edzéstári edzést, ismételj vagy helyezz át alkalmat. A Naptár az egyéni időpontokhoz, az Ügyfelek a kiosztáshoz tartozik. A sportoló sorozatait és súlyait a saját edzésénél szerkeszd; a programadatokhoz külön szerkesztőgomb tartozik.',
        },
        en: {
          title: 'Program editor: Workouts, Calendar, Clients',
          description:
            'Enter the name, start date, duration and difficulty, then create the program. In Workouts, choose a day and add a new or library workout, repeat or move an occurrence. Calendar handles individual dates; Clients handles assignments. Edit athlete sets and weights on their own session. A separate button opens program details for editing.',
        },
        de: {
          title: 'Programmeditor: Trainings, Kalender, Klienten',
          description:
            'Gib Name, Startdatum, Dauer und Schwierigkeit ein und erstelle das Programm. Unter Trainings wählst du Tage, ergänzt neue oder vorhandene Trainings und wiederholst oder verschiebst Termine. Kalender betrifft individuelle Daten, Klienten die Zuweisung. Sätze und Gewichte bearbeitest du am Training des Sportlers; Programmdaten öffnest du über eine eigene Bearbeitungstaste.',
        },
      },
    },
    {
      route: '/coach/programs/import',
      target: 'app-program-import h1',
      text: {
        hu: {
          title: 'Excel-import: előbb ellenőrzés, utána létrehozás',
          description:
            'Válassz .xlsx fájlt, és futtasd az előellenőrzést. Nézd át az edzések, gyakorlatok és sorozatok összesítését, a figyelmeztetéseket és a gyakorlatnevek párosítását. Az előnézet ellenőrzésre szolgál; a létrehozáshoz külön importálás szükséges. Az importhoz válassz ügyfelet, és ellenőrizd, hogy valóban neki szánod a programot.',
        },
        en: {
          title: 'Excel import: review before creating',
          description:
            'Choose an .xlsx file and preview it. Review workout, exercise and set totals, warnings and exercise-name matches. Preview is for checking; a separate import creates the program. Select a client for the import and confirm that the program is intended for that athlete.',
        },
        de: {
          title: 'Excel-Import: erst prüfen, dann erstellen',
          description:
            'Wähle eine .xlsx-Datei und öffne die Vorschau. Prüfe die Anzahl der Trainings, Übungen und Sätze, Warnungen und die Zuordnung von Übungsnamen. Die Vorschau dient der Prüfung; erst der Import erstellt das Programm. Wähle einen Klienten für den Import und prüfe, ob der Plan für diesen Sportler bestimmt ist.',
        },
      },
    },
    {
      route: '/coach/workouts',
      target: '[data-guide="coach-workouts"]',
      text: {
        hu: {
          title: 'Edzéstár: felhasználás vagy önálló másolat',
          description:
            'Az Edzéstárban a programokhoz felhasználható edzések és gyakorlatlistáik találhatók. A meglévő edzés felhasználása ugyanarra az edzésre hivatkozik; az önálló másolat külön szerkeszthető edzést hoz létre. A programhoz kötött edzés szerkesztése zárolt lehet: ilyenkor a felkínált szerkeszthető másolatot használd. A sportoló célértékeit és eredményeit az egyéni edzésnél kezeld.',
        },
        en: {
          title: 'Workout library: reuse or independent copy',
          description:
            'The library contains workouts and exercise lists for your programs. Reusing a workout refers to the same workout; an independent copy creates a separate editable one. Editing a workout linked to a program may be locked; use the offered editable copy. Manage athlete targets and results on their individual sessions.',
        },
        de: {
          title: 'Trainingsbibliothek: verwenden oder unabhängig kopieren',
          description:
            'Die Bibliothek enthält Trainings und Übungslisten für deine Programme. Die Wiederverwendung verweist auf dasselbe Training; eine unabhängige Kopie erstellt ein separat bearbeitbares Training. Ein mit einem Programm verbundenes Training kann gesperrt sein; nutze dann die angebotene bearbeitbare Kopie. Individuelle Zielwerte und Ergebnisse gehören zum Termin des Sportlers.',
        },
      },
    },
    {
      route: '/coach/exercises',
      target: '[data-guide="coach-exercises"]',
      text: {
        hu: {
          title: 'Gyakorlattár: az edzések építőelemei',
          description:
            'A Gyakorlattárban kereshetsz és szűrhetsz, megnyithatod a leírásokat, valamint gyakorlatokat hozhatsz létre vagy szerkeszthetsz. Egy gyakorlat a mozgás leírása; az edzés határozza meg, mely gyakorlatok milyen sorrendben szerepelnek. A sportoló konkrét sorozatszáma, célsúlya és teljesítménye ettől külön, a saját edzésadatainál jelenik meg.',
        },
        en: {
          title: 'Exercise library: the building blocks',
          description:
            'Search and filter exercises, read descriptions, or create and edit exercises. An exercise describes a movement; a workout determines which movements appear and in what order. An athlete’s specific sets, target weight and performance are separate records on their own workout.',
        },
        de: {
          title: 'Übungsbibliothek: die Bausteine',
          description:
            'Suche und filtere Übungen, lies Beschreibungen oder erstelle und bearbeite Übungen. Eine Übung beschreibt eine Bewegung; das Training legt Auswahl und Reihenfolge fest. Die konkreten Sätze, Zielgewichte und Leistungen eines Sportlers sind davon getrennte Daten am eigenen Training.',
        },
      },
    },
    {
      route: '/coach/profile',
      target: 'app-coach-profile h2',
      text: {
        hu: {
          title: 'Profil: az edző saját adatai',
          description:
            'A Profil menüpont az edzői fiókod adatait mutatja. Itt ellenőrizheted és módosíthatod a kitölthető személyes és kapcsolattartási mezőket, majd a mentés visszajelzésével ellenőrizheted az eredményt. Ez a saját profilod: az ügyfelek kiosztásait, programjait és edzéseredményeit az Ügyfelek és Programok oldalakon kezeld.',
        },
        en: {
          title: 'Profile: your own coach account',
          description:
            'Profile shows your coach account details. Review and edit the available personal and contact fields, save and check the confirmation. This is your own profile: manage client assignments, programs and performance from Clients and Programs.',
        },
        de: {
          title: 'Profil: dein eigenes Coach-Konto',
          description:
            'Das Profil zeigt deine Coach-Kontodaten. Prüfe und bearbeite die verfügbaren persönlichen und Kontaktangaben, speichere und beachte die Bestätigung. Dies ist dein eigenes Profil; Zuweisungen, Programme und Leistungen deiner Klienten verwaltest du unter Klienten und Programme.',
        },
      },
    },
    {
      route: '/coach/bug-report',
      target: 'app-bug-report h2',
      text: {
        hu: {
          title: 'Hibabejelentés: a probléma pontos helye',
          description:
            'Írd le, melyik oldalon, melyik lépéssor után, milyen eltérést tapasztaltál. Különítsd el, hogy a közös programmal, egy adott sportoló edzésével vagy a megjelenítéssel van-e gond; ez segít azonosítani a hibát. Képernyőképet is csatolhatsz. A sikeres beküldés bejelentésazonosítót ad, de nem módosítja és nem javítja automatikusan az edzésadatokat.',
        },
        en: {
          title: 'Bug reports: pinpoint the problem',
          description:
            'Describe the page, the steps you took and the unexpected result. Explain whether it concerns a shared program, one athlete’s session or the display; this helps identify the issue. You can attach screenshots. Submission returns a report ID but does not automatically change or repair training records.',
        },
        de: {
          title: 'Fehler melden: das Problem eingrenzen',
          description:
            'Beschreibe Seite, Schritte und unerwartetes Ergebnis. Unterscheide zwischen gemeinsamem Programm, dem Training eines einzelnen Sportlers und Darstellungsproblemen. Das erleichtert die Fehlersuche. Du kannst Bildschirmbilder anhängen. Die Meldungsnummer bestätigt den Eingang, verändert oder repariert aber keine Trainingsdaten automatisch.',
        },
      },
    },
    {
      route: '/coach/profile',
      target: 'app-coach-profile h2',
      text: {
        hu: {
          title: 'Fiók törlése: külön kérelem',
          description:
            'A Fiók törlése menüpont egy külön nyilvános űrlaphoz vezet, ahol a fiók e-mail-címével, hozzájárulással és CAPTCHA-ellenőrzéssel kérhetsz törlést. A beküldés visszaigazolása a kérelem átvételét jelenti, nem azonnali törlést. A feldolgozásról és az adatmegőrzésről az űrlap ad tájékoztatást; ez nem azonos egy programkiosztás visszavonásával.',
        },
        en: {
          title: 'Account deletion: a separate request',
          description:
            'Delete account opens a separate public form. Request deletion using the account email, consent and CAPTCHA verification. Confirmation means the request was received, not immediate deletion. The form explains processing and data retention. This is different from revoking a program assignment.',
        },
        de: {
          title: 'Konto löschen: ein eigener Antrag',
          description:
            'Konto löschen öffnet ein separates öffentliches Formular. Mit Konto-E-Mail, Zustimmung und CAPTCHA beantragst du die Löschung. Die Bestätigung bedeutet den Eingang, nicht die sofortige Löschung. Das Formular erläutert Bearbeitung und Aufbewahrung. Dies ist etwas anderes als das Zurückziehen einer Programmzuweisung.',
        },
      },
    },
    {
      route: '/coach/dashboard',
      target: 'app-layout header',
      text: {
        hu: {
          title: 'Navigáció, kijelentkezés és az útmutató újraindítása',
          description:
            'Az oldalsó menü az összes edzői területet eléri; mobilon a fejléc menügombjával nyithatod ki. A navigációs útvonal visszavezet a szülőoldalakra, a nyelvválasztó magyar, angol és német feliratokra vált. Kijelentkezés előtt ellenőrizd a mentéseidet. Az Edzői útmutató menüpont bármikor újraindítja ezt a bemutatót; a bemutató önmagában nem hoz létre és nem oszt ki programot.',
        },
        en: {
          title: 'Navigation, signing out and restarting the guide',
          description:
            'The side menu opens every coach area; on mobile, open it with the header menu button. Breadcrumbs lead to parent pages, and the language selector switches between Hungarian, English and German. Check saved changes before signing out. Coach guide restarts this tour at any time; the tour itself does not create or assign programs.',
        },
        de: {
          title: 'Navigation, Abmelden und Hilfe erneut starten',
          description:
            'Das Seitenmenü führt zu allen Coach-Bereichen; mobil öffnest du es über die Menütaste. Der Navigationspfad führt zu übergeordneten Seiten, die Sprachauswahl wechselt zwischen Ungarisch, Englisch und Deutsch. Prüfe gespeicherte Änderungen vor dem Abmelden. Die Coach-Anleitung startet diese Einführung erneut; sie erstellt oder verteilt selbst keine Programme.',
        },
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
