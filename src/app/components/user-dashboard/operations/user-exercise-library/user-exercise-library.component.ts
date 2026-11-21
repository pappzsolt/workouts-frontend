import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { skip, Subscription } from 'rxjs';
import { Exercise } from '../../../../models/exercise.model';
import { UserExerciseCatalogueService } from '../../../../services/user/user-exercise-catalogue.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { LoggerService } from '../../../../services/logger.service';
import {
  errorMessage,
  responseMessage,
} from '../../../../models/backend-dto/common/api-response-message';
import {
  exerciseImageSources,
  markExerciseImageBroken,
} from '../../../../constants/exercise-images';
import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { AppLoadingComponent } from '../../../shared/components/app-state/app-state.component';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { AppCardBannerComponent } from '../../../shared/components/app-card-banner/app-card-banner.component';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ExerciseSearchFieldComponent } from '../../../shared/components/exercise-search-field/exercise-search-field.component';
import type { SelectOption } from '../../../../models/common/select-option.model';

/** USER-only read-only exercise browser. Programme/workout editing remains in the existing personal editor. */
@Component({
  selector: 'app-user-exercise-library',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    AppSearchComponent,
    AppHeadingDirective,
    AppLoadingComponent,
    AppCardComponent,
    AppCardBannerComponent,
    AppButtonComponent,
    AppIconComponent,
    MessageComponent,
    PaginationComponent,
    ExerciseSearchFieldComponent,
  ],
  templateUrl: './user-exercise-library.component.html',
})
export class UserExerciseLibraryComponent implements OnInit {
  private readonly catalogue = inject(UserExerciseCatalogueService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);
  private searchRequest?: Subscription;

  exercises: Exercise[] = [];
  loading = false;
  message = '';
  filterOptionsError = '';
  searchTerm = '';
  private appliedSearchTerm = '';
  searchField = 'all';
  bodyPartFilter = '';
  equipmentFilter = '';
  bodyPartOptions: string[] = [];
  equipmentOptions: string[] = [];
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 0;
  readonly itemsPerPage = 6;
  totalElements = 0;
  totalPages = 1;
  expandedExerciseId: number | null = null;

  readonly searchFieldOptions: SelectOption[] = [
    { value: 'all', label: 'userExerciseLibrary.searchFields.all' },
    { value: 'name', label: 'userExerciseLibrary.searchFields.name' },
    { value: 'bodyPart', label: 'userExerciseLibrary.searchFields.bodyPart' },
    { value: 'primaryMuscles', label: 'userExerciseLibrary.searchFields.primaryMuscles' },
    { value: 'secondaryMuscles', label: 'userExerciseLibrary.searchFields.secondaryMuscles' },
  ];

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadExercises();
    this.language.language$.pipe(skip(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.currentPage = 0;
      this.loadExercises();
    });
  }

  private loadFilterOptions(): void {
    this.catalogue
      .filters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.filterOptionsError = responseMessage(
              [response],
              'userExerciseLibrary.filterLoadError',
            );
            return;
          }
          this.bodyPartOptions = response.data?.bodyParts ?? [];
          this.equipmentOptions = response.data?.equipment ?? [];
          this.filterOptionsError = '';
        },
        error: (error) => {
          this.logger.error('[UserExerciseLibrary] Filter options failed', error);
          this.filterOptionsError = errorMessage(error, 'userExerciseLibrary.filterLoadError');
        },
      });
  }

  loadExercises(): void {
    this.searchRequest?.unsubscribe();
    this.loading = true;
    this.message = '';
    this.searchRequest = this.catalogue
      .search(
        this.resolvedSearchTerm(),
        this.searchField,
        this.currentPage,
        this.itemsPerPage,
        this.sortDirection,
        this.bodyPartFilter,
        this.equipmentFilter,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (!response.success) {
            this.resetResults();
            this.message = responseMessage([response], 'userExerciseLibrary.loadError');
            return;
          }
          this.exercises = response.data?.content ?? [];
          this.totalElements = response.data?.totalElements ?? 0;
          this.totalPages = Math.max(1, response.data?.totalPages ?? 1);
          if (!this.exercises.some((exercise) => exercise.id === this.expandedExerciseId)) {
            this.expandedExerciseId = null;
          }
        },
        error: (error) => {
          this.logger.error('[UserExerciseLibrary] Search failed', error);
          this.resetResults();
          this.message = errorMessage(error, 'userExerciseLibrary.loadError');
          this.loading = false;
        },
      });
  }

  private resetResults(): void {
    this.exercises = [];
    this.totalElements = 0;
    this.totalPages = 1;
    this.expandedExerciseId = null;
  }

  search(): void {
    this.appliedSearchTerm = this.searchTerm.trim();
    this.currentPage = 0;
    this.loadExercises();
  }

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    if (!term) this.search();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadExercises();
  }

  onPageChange(page: number): void {
    const next = page - 1;
    if (next < 0 || next >= this.totalPages || next === this.currentPage) return;
    this.currentPage = next;
    this.loadExercises();
  }

  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.currentPage = 0;
    this.loadExercises();
  }

  toggleDetails(id: number | undefined): void {
    if (id == null) return;
    this.expandedExerciseId = this.expandedExerciseId === id ? null : id;
  }

  get hasActiveSearch(): boolean {
    return !!(this.appliedSearchTerm || this.bodyPartFilter || this.equipmentFilter);
  }

  bodyPartLabel(code: string): string {
    return this.translatedCode('coachWorkspace.bodyPart', code);
  }

  equipmentLabel(code: string): string {
    return this.translatedCode('coachWorkspace.equipment', code);
  }

  private translatedCode(prefix: string, code: string): string {
    const key = `${prefix}.${code}`;
    const value = this.translate.instant(key);
    return value === key ? code.replace(/[_-]/g, ' ') : value;
  }

  private resolvedSearchTerm(): string {
    if (this.searchField !== 'bodyPart' || !this.appliedSearchTerm) return this.appliedSearchTerm;
    const requested = this.appliedSearchTerm.toLocaleLowerCase();
    const matches = this.bodyPartOptions.filter(
      (code) =>
        code.toLocaleLowerCase().includes(requested) ||
        this.bodyPartLabel(code).toLocaleLowerCase().includes(requested),
    );
    return matches.length === 1 ? matches[0] : this.appliedSearchTerm;
  }

  getExerciseImages(exercise: Exercise): string[] {
    return exerciseImageSources(exercise.imageUrl);
  }

  onExerciseImageError(source: string): void {
    markExerciseImageBroken(source);
  }

  trackByExercise(index: number, exercise: Exercise): number {
    return exercise.id ?? index;
  }

  trackByImage(index: number, image: string): string {
    return image;
  }
}
