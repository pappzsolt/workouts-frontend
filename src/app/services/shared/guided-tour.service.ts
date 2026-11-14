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
            'Itt a saját terveidet és önálló edzéseidet kezelheted. Keress név szerint, vagy szűrj típusra. Az Új saját program többnapos tervet, az Önálló edzés létrehozása egyetlen alkalmat készít. A Megnyitás a tervhez, az Edzések megnyitása az elindított alkalmakhoz vezet. A következő lépésekben megismered a naptáras szerkesztést, a sorozatcélokat és a mentés–indítás különbségét.',
        },
        en: {
          title: 'Personal programs: from plan to training',
          description:
            'Manage your own plans and standalone workouts here. Search by name or filter by type. New personal program creates a multi-day plan; Create standalone workout creates one session. Open takes you to the plan, while Open workouts takes you to started sessions. The next steps explain calendar editing, set targets and the difference between saving and starting.',
        },
        de: {
          title: 'Eigene Programme: vom Plan zum Training',
          description:
            'Hier verwaltest du eigene Pläne und Einzeltrainings. Suche nach Namen oder filtere nach Typ. Neues eigenes Programm erstellt einen mehrtägigen Plan; Einzeltraining erstellen einen einzelnen Termin. Öffnen führt zum Plan, Trainings öffnen zu gestarteten Einheiten. Die nächsten Schritte erklären Kalenderplanung, Satzziele sowie Speichern und Starten.',
        },
      },
    },
    {
      route: '/user/personal-programs/new',
      target: 'app-personal-program-editor form > fieldset',
      text: {
        hu: {
          title: 'Saját program: adatok és kezdőnap',
          description:
            'Adj nevet a programnak, majd add meg az időtartamát napokban. Az 1. programnap a kezdőnapra esik, nem feltétlenül hétfőre. Ha nem választasz kezdőnapot, indításkor az aznapi dátum lesz az alap. A nehézség és a leírás segít később felismerni a tervet. Ezt a programot saját magadnak készíted; a mentéshez és indításhoz nem kell coach-kiosztás.',
        },
        en: {
          title: 'Personal program: details and start date',
          description:
            'Name the program and set its duration in days. Program day 1 falls on the start date, which need not be a Monday. Without a chosen date, starting uses that day as the start date. Difficulty and description help identify the plan later. This program is for you: saving and starting do not require a coach assignment.',
        },
        de: {
          title: 'Eigenes Programm: Daten und Starttag',
          description:
            'Benenne das Programm und lege die Dauer in Tagen fest. Programmtag 1 fällt auf den Starttag, nicht zwingend auf einen Montag. Ohne gewähltes Datum gilt beim Start der aktuelle Tag. Schwierigkeit und Beschreibung helfen beim Wiedererkennen. Du erstellst den Plan für dich; Speichern und Starten erfordern keine Trainerzuweisung.',
        },
      },
    },
    {
      route: '/user/personal-programs/new',
      target: 'app-personal-program-editor app-personal-program-calendar > section',
      text: {
        hu: {
          title: 'Naptáras tervezés és heti ismétlés',
          description:
            'Válassz napot a naptárban, majd az Edzésnap hozzáadása gombbal készíts rá edzést. Adj nevet, és válassz gyakorlatokat. Az üres nap pihenőnap marad. Megadott kezdőnapnál a hosszabb program hónapjai között a nyilakkal válthatsz. Az Ismétlés hetente a következő hetek még üres megfelelő napjaira másolja az edzést és a sorozatcélokat; a már foglalt napokat kihagyja. A másolatok később külön szerkeszthetők. Napváltás után is mentsd el a programot.',
        },
        en: {
          title: 'Calendar planning and weekly repetition',
          description:
            'Choose a calendar day, then use Add workout day to create its workout. Name it and choose exercises. An empty day remains a rest day. With a start date set, use the arrows to change months in longer programs. Repeat weekly copies the workout and set targets to the matching empty days in later weeks, skipping occupied days. Each copy can be edited independently. Changing days does not replace saving the program.',
        },
        de: {
          title: 'Kalenderplanung und wöchentliche Wiederholung',
          description:
            'Wähle einen Kalendertag und erstelle über Trainingstag hinzufügen ein Training mit Namen und Übungen. Leere Tage bleiben Ruhetage. Bei längeren Plänen mit Startdatum wechselst du den Monat mit den Pfeilen. Wöchentlich wiederholen kopiert Training und Satzziele auf passende freie Tage späterer Wochen; belegte Tage bleiben erhalten. Kopien sind unabhängig bearbeitbar. Speichere den Plan auch nach einem Tagwechsel.',
        },
      },
    },
    {
      route: '/user/personal-programs/new',
      target: 'app-personal-program-editor form',
      text: {
        hu: {
          title: 'Sorozatonkénti súly, ismétlés és RPE',
          description:
            'Gyakorlat hozzáadása után minden sor egy tervezett sorozat. Külön célismétlést, kilogrammban megadott súlyt, másodpercben megadott pihenőt, tervezett RPE-t és megjegyzést adhatsz meg. A súly és az RPE üresen is maradhat. Az RPE a sorozat végére várt erőkifejtés 0–10-es jelzése, félpontos lépésekben. A Sorozat hozzáadása az utolsó sor értékeit másolja. Az Első sorozat értékei mindre az összes többi sor teljes célértékeit felülírja, ezért utána állítsd be az eltérő sorozatokat.',
        },
        en: {
          title: 'Weight, repetitions and RPE for each set',
          description:
            'After adding an exercise, each row is a planned set. Enter its target repetitions, weight in kilograms, rest in seconds, target RPE and notes. Weight and RPE may remain blank. RPE describes the expected effort at the end of the set on a 0–10 scale in half-point steps. Add set copies the last row. Copying the first set to all rows overwrites all targets in the other rows, so adjust differing sets afterwards.',
        },
        de: {
          title: 'Gewicht, Wiederholungen und RPE pro Satz',
          description:
            'Nach dem Hinzufügen einer Übung steht jede Zeile für einen geplanten Satz. Erfasse Zielwiederholungen, Gewicht in Kilogramm, Pause in Sekunden, Ziel-RPE und Notizen. Gewicht und RPE dürfen leer bleiben. RPE beschreibt die erwartete Anstrengung am Satzende auf einer Skala von 0–10 in Halbpunktschritten. Satz hinzufügen kopiert die letzte Zeile. Das Übertragen des ersten Satzes auf alle Zeilen überschreibt deren sämtliche Zielwerte; passe abweichende Sätze danach an.',
        },
      },
    },
    {
      route: '/user/personal-programs/new',
      target: 'app-personal-program-editor button[type="submit"]',
      text: {
        hu: {
          title: 'Piszkozat mentése, majd programindítás',
          description:
            'A Piszkozat mentése a teljes tervet őrzi meg, az összes nap sorozatcéljaival együtt. A Program indítása csak mentett, legalább egy edzésnapot és minden edzésen legalább egy gyakorlatot tartalmazó tervnél érhető el. Indításkor létrejönnek a dátumhoz kötött edzések a megadott célértékekkel, eredmények nélkül. Ezekhez az Edzések megnyitása gomb vezet. Az elindított terv zárolt; új változathoz készíts másolatot. Mentési hiba esetén a szerkesztés megmarad: javítsd a jelzett adatokat, és próbáld újra.',
        },
        en: {
          title: 'Save the draft, then start the program',
          description:
            'Save draft stores the whole plan, including set targets on every day. Start program requires a saved plan with at least one training day and at least one exercise in every workout. Starting creates dated sessions with the planned targets and no performance results. Use Open workouts to train. A started plan is locked; make a copy for a new version. If saving fails, your edits remain: correct the reported fields and try again.',
        },
        de: {
          title: 'Entwurf speichern, dann Programm starten',
          description:
            'Entwurf speichern sichert den ganzen Plan einschließlich der Satzziele aller Tage. Zum Starten muss der Plan gespeichert sein und mindestens einen Trainingstag sowie eine Übung pro Training enthalten. Beim Start entstehen datierte Einheiten mit den Zielwerten, ohne Leistungsergebnisse. Über Trainings öffnen beginnst du das Training. Ein gestarteter Plan ist gesperrt; erstelle für Änderungen eine Kopie. Bei Speicherfehlern bleiben Eingaben erhalten: korrigiere die gemeldeten Felder und versuche es erneut.',
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
            'Egyetlen edzéshez adj nevet, opcionálisan dátumot, majd válassz gyakorlatokat és add meg a sorozatok célértékeit. Itt nincs többnapos naptár. Előbb mentsd, utána indítsd el az edzést. A korábbi alkalom megismétléséhez az Új alkalom megtartja a gyakorlatokat és sorozatcélokat, de új, üres dátumú piszkozatot készít: válassz napot, ellenőrizd a célokat, majd indítsd el. A korábbi tényleges eredmények nem kerülnek át.',
        },
        en: {
          title: 'Create a standalone workout',
          description:
            'For one workout, enter a name and optional date, choose exercises and set each set target. There is no multi-day calendar here. Save before starting. New session retains the exercises and set targets of a started workout but creates a new draft with no date: choose a day, review the targets and start it. Previous actual performance is not copied.',
        },
        de: {
          title: 'Ein neues Einzeltraining',
          description:
            'Für ein Training gibst du einen Namen und optional ein Datum an, wählst Übungen und legst Satzziele fest. Hier gibt es keinen mehrtägigen Kalender. Speichere vor dem Start. Neue Einheit übernimmt Übungen und Satzziele eines gestarteten Trainings, erstellt aber einen Entwurf ohne Datum: wähle einen Tag, prüfe die Ziele und starte ihn. Frühere Ist-Leistungen werden nicht kopiert.',
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
            'A sablon a bevált önálló edzés gyakorlat- és sorozattervét őrzi, a célsúlyokkal, ismétlésekkel, pihenőkkel és RPE-vel együtt. Az edzés módosításait előbb mentsd, majd válaszd a Mentés edzéssablonként gombot. Az Új edzésalkalom ebből külön piszkozatot készít: a dátumot és a célokat ellenőrizd, mentsd a változásokat, majd indítsd el. Tényleges eredmény, teljesítési állapot és időzítő nem másolódik. A sablon törlése a korábbi edzéseket nem törli.',
        },
        en: {
          title: 'Workout templates and favorites',
          description:
            'A template stores the exercise and set plan of a standalone workout, including target weights, repetitions, rest and RPE. Save workout changes before selecting Save as workout template. New workout session creates a separate draft: review its date and targets, save any changes and start it. Actual results, completion states and timers are not copied. Deleting a template does not delete earlier sessions.',
        },
        de: {
          title: 'Trainingsvorlagen und Favoriten',
          description:
            'Eine Vorlage speichert den Übungs- und Satzplan eines Einzeltrainings einschließlich Zielgewichten, Wiederholungen, Pausen und RPE. Speichere Änderungen vor Als Trainingsvorlage speichern. Neue Trainingseinheit erstellt einen eigenen Entwurf: prüfe Datum und Ziele, speichere Änderungen und starte ihn. Ist-Ergebnisse, Abschlussstatus und Timer werden nicht kopiert. Das Löschen einer Vorlage löscht keine früheren Einheiten.',
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
            'Válassz .xlsx fájlt, futtasd az előellenőrzést, és nézd át a figyelmeztetéseket. Az ismeretlen vagy többértelmű gyakorlatneveket párosítsd a katalógussal, majd ellenőrizd újra. Az előnézet még nem mentés. Az Új program létrehozása már az ütemezett edzéseket is létrehozza; az importált saját program ezért elindított, zárolt tervként nyílhat meg. Ellenőrizd az import eredményét és a megfelelő edzésalkalmat. Ugyanaz a fájl ismételt importálása új programot készít.',
        },
        en: {
          title: 'Import a program from Excel',
          description:
            'Choose an .xlsx file, run the preview and review its warnings. Match unknown or ambiguous exercise names to the catalogue and check again. Previewing does not save. Create new program also creates scheduled sessions, so an imported personal program may open as a started, locked plan. Review the import result and the correct session. Importing the same file again creates another program.',
        },
        de: {
          title: 'Ein Programm aus Excel importieren',
          description:
            'Wähle eine .xlsx-Datei, prüfe die Vorschau und ihre Warnungen. Ordne unbekannte oder mehrdeutige Übungsnamen dem Katalog zu und prüfe erneut. Die Vorschau speichert noch nichts. Neues Programm erstellen erzeugt auch geplante Einheiten; ein importiertes eigenes Programm kann daher als gestarteter, gesperrter Plan erscheinen. Prüfe Importergebnis und Trainingstermin. Ein erneuter Import derselben Datei erstellt ein weiteres Programm.',
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
