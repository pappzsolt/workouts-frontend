import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, ViewChild, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AppButtonComponent } from '../components/app-button/app-button.component';
import { GuidedTourService, GUIDE_STEPS } from '../../../services/shared/guided-tour.service';

/** Navigates to real pages, highlights stable anchors and never edits user data. */
@Component({
  selector: 'app-guided-tour',
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  templateUrl: './guided-tour.component.html',
})
export class GuidedTourComponent {
  readonly tour = inject(GuidedTourService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('tourDialog') private dialog?: ElementRef<HTMLElement>;
  spotlight: Record<string, string> | null = null;
  private pending: ReturnType<typeof setTimeout>[] = [];

  get step() {
    const state = this.tour.active();
    return state ? GUIDE_STEPS[state.role][state.index] : null;
  }

  get text() {
    return this.step?.text[this.tour.languageCode] ?? null;
  }

  get steps() {
    const state = this.tour.active();
    return state ? GUIDE_STEPS[state.role] : [];
  }

  get total(): number {
    return this.steps.length;
  }

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.scheduleHighlight());

    this.destroyRef.onDestroy(() => this.cancelPending());

    effect(() => {
      const state = this.tour.active();
      if (!state) {
        this.spotlight = null;
        this.cancelPending();
        return;
      }
      const path = GUIDE_STEPS[state.role][state.index].route;
      this.spotlight = null;
      this.cancelPending();
      // An initial login may still be activating its target route. Let that
      // navigation finish before starting another navigation to the same page.
      this.pending.push(setTimeout(() => {
        const latest = this.tour.active();
        if (!latest || GUIDE_STEPS[latest.role][latest.index].route !== path) return;
        if (this.router.url.split(/[?#]/, 1)[0] === path) {
          this.scheduleHighlight();
        } else {
          void this.router.navigateByUrl(path).then(
            () => this.scheduleHighlight(),
            () => this.scheduleHighlight(),
          );
        }
      }, 0));
      this.pending.push(setTimeout(() => this.dialog?.nativeElement.focus(), 0));
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.tour.active()) this.updateSpotlight(false);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.tour.active()) this.updateSpotlight(false);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.tour.active()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.tour.dismiss();
      return;
    }
    if (event.key !== 'Tab' || !this.dialog) return;
    const buttons = Array.from(this.dialog.nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    if (!buttons.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === this.dialog.nativeElement)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Route components are lazy loaded, so retry after navigation and initial render. */
  private scheduleHighlight(): void {
    this.cancelPending();
    for (const delay of [0, 150, 500]) {
      this.pending.push(setTimeout(() => {
        if (!this.tour.active()) return;
        this.updateSpotlight(delay === 0);
        if (delay === 0) this.dialog?.nativeElement.focus();
      }, delay));
    }
  }

  private updateSpotlight(scroll: boolean): void {
    const target = this.step && document.querySelector<HTMLElement>(this.step.target);
    if (!target) { this.spotlight = null; return; }
    if (scroll) target.scrollIntoView({ block: 'center', behavior: 'auto' });
    const rect = target.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) { this.spotlight = null; return; }
    const margin = 6;
    this.spotlight = {
      top: `${Math.max(4, rect.top - margin)}px`,
      left: `${Math.max(4, rect.left - margin)}px`,
      width: `${Math.min(window.innerWidth - 8, rect.width + margin * 2)}px`,
      height: `${Math.min(window.innerHeight - 8, rect.height + margin * 2)}px`,
    };
  }

  private cancelPending(): void {
    this.pending.forEach(timer => clearTimeout(timer));
    this.pending = [];
  }
}
