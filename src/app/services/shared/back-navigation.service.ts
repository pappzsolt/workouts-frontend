import type { NavigationHistoryEntry } from '../../models/common/navigation-history-entry.model';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { LoggerService } from '../logger.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class BackNavigationService {
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  private navigationHistory: NavigationHistoryEntry[] = [];
  private isBackNavigation = false;

  constructor(private router: Router) {

    const currentUrl = this.router.url;


    if (currentUrl && currentUrl !== '/') {
      const entry: NavigationHistoryEntry = {
        url: currentUrl,
        state: this.getCurrentState(),
      };

      this.navigationHistory.push(entry);

    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const currentUrl = event.urlAfterRedirects;


        // A back() által indított navigációt nem rögzítjük újra.
        if (this.isBackNavigation) {

          this.isBackNavigation = false;
          return;
        }

        const lastEntry = this.navigationHistory[this.navigationHistory.length - 1];

        // Azonos URL ne kerüljön be egymás után.
        if (lastEntry?.url === currentUrl) {

          lastEntry.state = this.getCurrentState();
          return;
        }

        const entry: NavigationHistoryEntry = {
          url: currentUrl,
          state: this.getCurrentState(),
        };

        this.navigationHistory.push(entry);
      });
  }

  /**
   * Visszalépés az előző alkalmazáson belüli oldalra.
   * A céloldal az előzményekben marad.
   */
  back(fallbackUrl: string = '/'): void {
    const currentUrl = this.router.url;

    const lastEntry = this.navigationHistory[this.navigationHistory.length - 1];

    // Csak az aktuális oldalt távolítjuk el.
    if (lastEntry?.url === currentUrl) {
      const removed = this.navigationHistory.pop();

    } else {
      this.logger.warn(
        '[BackNavigation] Az aktuális URL nem egyezik ' + 'az előzmények utolsó elemével.',
        {
          currentUrl,
          lastEntry,
        },
      );
    }

    // A korábbi oldalt csak megkeressük, nem vesszük ki.
    const previousEntry = this.navigationHistory[this.navigationHistory.length - 1];

    if (previousEntry) {


      this.isBackNavigation = true;

      this.router.navigateByUrl(previousEntry.url, {
        state: previousEntry.state,
      });

      return;
    }

    // Nincs további belső előzmény.
    this.logger.warn('[BackNavigation] Nincs további előzmény. ' + 'Fallback használata:', fallbackUrl);

    this.isBackNavigation = true;

    this.router.navigateByUrl(fallbackUrl);

  }

  /**
   * Navigálás megadott URL-re,
   * opcionális navigation state adatokkal.
   */
  navigateTo(url: string, state?: Record<string, unknown>): void {

    this.router.navigateByUrl(url, {
      state,
    });
  }

  /**
   * Az aktuális navigation state lekérése.
   */
  private getCurrentState(): Record<string, unknown> {
    const state = { ...history.state };

    // Az Angular által kezelt navigationId nem része
    // az alkalmazás saját state-ének.
    delete state['navigationId'];

    return state;
  }
}
