import { Component, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './app-search.component.html',
  styleUrl: './app-search.component.css',
})
export class AppSearchComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => this.searchTermChange.emit(value));
  }
  @Input() searchTerm = '';

  @Input() label = 'coachPrograms.search';

  @Input() placeholder = 'coachPrograms.searchPlaceholder';

  @Input() inputId = 'appSearch';

  @Output() searchTermChange = new EventEmitter<string>();

  onSearchChange(value: string): void {
    this.searchInput$.next(value);
  }
}
