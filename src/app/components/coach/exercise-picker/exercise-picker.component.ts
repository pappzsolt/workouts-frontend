import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, switchMap, catchError, of } from 'rxjs';

import { AppInputDirective } from '../../shared/components/form-controls/app-input.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type {
  CoachExercisePage,
  CoachExerciseQuery,
  CoachExerciseSearchItem,
} from '../../../models/coach-workspace.model';
import { codeLabel } from '../coach-ui';

/**
 * Gyakorlatválasztó: kereső nélkül is böngészhető, lapozható lista,
 * testrész és eszköz szerinti szűréssel. A név, a szinonimák, az izmok
 * és a leírás alapján is keres, bármely nyelvű névvel.
 */
@Component({
  selector: 'app-exercise-picker',
  standalone: true,
  imports: [AppInputDirective, CommonModule, FormsModule, TranslatePipe, AppIconComponent],
  templateUrl: './exercise-picker.component.html',
})
export class ExercisePickerComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Már kiválasztott gyakorlatok azonosítói (ezeknél a gomb tiltott). */
  @Input() chosenIds: number[] = [];
  /** Oldalméret. */
  @Input() pageSize = 10;
  @Input() showIds = false;
  @Output() picked = new EventEmitter<CoachExerciseSearchItem>();

  query: CoachExerciseQuery = { search: '', bodyPart: '', equipment: '', page: 0, size: 10 };
  page: CoachExercisePage = { items: [], totalElements: 0, totalPages: 1 };
  bodyParts: string[] = [];
  equipment: string[] = [];
  loading = false;
  failed = false;
  expandedId: number | null = null;

  private readonly load$ = new Subject<{ debounce: boolean }>();

  ngOnInit(): void {
    this.query.size = this.pageSize;
    this.load$
      .pipe(
        debounceTime(0),
        switchMap(({ debounce }) => {
          this.loading = true;
          const request = this.workspace.browseExercises({ ...this.query }).pipe(
            catchError(() => {
              this.failed = true;
              return of<CoachExercisePage>({ items: [], totalElements: 0, totalPages: 1 });
            }),
          );
          return debounce ? of(null).pipe(debounceTime(300), switchMap(() => request)) : request;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.loading = false;
        this.page = page;
      });

    this.workspace
      .getExerciseFilterOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => {
          this.bodyParts = options.bodyParts;
          this.equipment = options.equipment;
        },
        error: () => undefined,
      });

    this.reload(false);
  }

  onSearch(term: string): void {
    this.query.search = term;
    this.query.page = 0;
    this.reload(true);
  }

  onFilterChange(): void {
    this.query.page = 0;
    this.reload(false);
  }

  clearFilters(): void {
    this.query = { ...this.query, search: '', bodyPart: '', equipment: '', page: 0 };
    this.reload(false);
  }

  get hasFilters(): boolean {
    return !!(this.query.search.trim() || this.query.bodyPart || this.query.equipment);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.page.totalPages || page === this.query.page) return;
    this.query.page = page;
    this.reload(false);
  }

  isChosen(id: number): boolean {
    return this.chosenIds.includes(id);
  }

  toggleDetails(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  bodyPartLabel(code: string | null | undefined): string {
    return codeLabel(this.translate, 'coachWorkspace.bodyPart', code);
  }

  equipmentLabel(code: string | null | undefined): string {
    return codeLabel(this.translate, 'coachWorkspace.equipment', code);
  }

  private reload(debounce: boolean): void {
    this.failed = false;
    this.load$.next({ debounce });
  }
}
