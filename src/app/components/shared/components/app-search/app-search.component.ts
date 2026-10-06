import { AppButtonComponent } from '../app-button/app-button.component';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  inject,
  numberAttribute,
} from '@angular/core';
import { Subject, map, of, switchMap, takeUntil, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [AppButtonComponent, FormsModule, TranslatePipe, AppIconComponent],
  templateUrl: './app-search.component.html',
  styleUrl: './app-search.component.css',
})
export class AppSearchComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput$ = new Subject<string>();
  private readonly cancelPending$ = new Subject<void>();
  private currentTerm = '';
  private delayMs = 300;
  private isDisabled = false;
  private lastEmittedTerm?: string;

  constructor() {
    this.searchInput$
      .pipe(
        switchMap((value) =>
          (this.delayMs === 0 ? of(value) : timer(this.delayMs).pipe(map(() => value))).pipe(
            takeUntil(this.cancelPending$),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => this.emitSearchTerm(value));
  }

  @Input()
  get searchTerm(): string {
    return this.currentTerm;
  }
  set searchTerm(value: string) {
    if (value === this.currentTerm) return;
    this.cancelPending$.next();
    this.currentTerm = value;
    this.lastEmittedTerm = undefined;
  }

  /** Zero emits synchronously; existing consumers retain the 300 ms delay. */
  @Input({ transform: numberAttribute })
  get debounceMs(): number {
    return this.delayMs;
  }
  set debounceMs(value: number) {
    this.delayMs = Number.isFinite(value) ? Math.max(0, value) : 300;
  }

  @Input({ transform: booleanAttribute })
  get disabled(): boolean {
    return this.isDisabled;
  }
  set disabled(value: boolean) {
    this.isDisabled = value;
    if (value) this.cancelPending$.next();
  }

  @Input({ transform: booleanAttribute }) showClearButton = false;

  @Input() clearLabel = 'appSearch.clear';

  @Input() label = 'coachPrograms.search';

  @Input() placeholder = 'coachPrograms.searchPlaceholder';

  @Input() inputId = 'appSearch';

  @Output() searchTermChange = new EventEmitter<string>();

  /** Immediate form value, independent of the debounced search event. */
  @Output() searchTermInput = new EventEmitter<string>();

  onSearchChange(value: string): void {
    if (this.disabled) return;
    this.currentTerm = value;
    this.searchTermInput.emit(value);
    // An immediate consumer may reset or disable the field in its handler.
    if (this.disabled || this.currentTerm !== value) return;
    this.searchInput$.next(value);
  }

  clear(): void {
    if (this.disabled) return;
    this.cancelPending$.next();
    this.currentTerm = '';
    this.searchTermInput.emit('');
    if (!this.disabled && this.currentTerm === '') this.emitSearchTerm('');
  }

  private emitSearchTerm(value: string): void {
    if (value === this.lastEmittedTerm) return;
    this.lastEmittedTerm = value;
    this.searchTermChange.emit(value);
  }
}
