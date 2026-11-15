import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, merge, of, switchMap, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AppPageHeaderComponent } from '../../../shared/components/app-page-header/app-page-header.component';
import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { AppLoadingComponent } from '../../../shared/components/app-state/app-state.component';
import { AppEmptyStateComponent } from '../../../shared/components/app-state/app-state.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { AppCardBannerComponent } from '../../../shared/components/app-card-banner/app-card-banner.component';
import { AppCardStatComponent } from '../../../shared/components/app-card-stat/app-card-stat.component';
import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { PersonalProgramSummary } from '../../../../models/personal-program.model';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';

@Component({
  selector: 'app-personal-programs',
  standalone: true,
  imports: [
    AppPageHeaderComponent,
    AppHeadingDirective,
    AppLoadingComponent,
    AppEmptyStateComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    TranslatePipe,
    MessageComponent,
    AppCardComponent,
    AppIconComponent,
    AppCardBannerComponent,
    AppCardStatComponent,
    AppSearchComponent,
    PaginationComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './personal-programs.component.html',
})
export class PersonalProgramsComponent implements OnInit {
  private readonly service = inject(PersonalProgramService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  programs: PersonalProgramSummary[] = [];
  private readonly reload$ = new Subject<void>();
  search = '';
  page = 0;
  readonly pageSize = 12;
  totalItems = 0;
  readonly standalone = inject(ActivatedRoute).snapshot.data['standalone'] === true;
  loading = false;
  message = '';
  successMessage = '';
  busy = false;
  pendingDelete: PersonalProgramSummary | null = null;
  get filtered(): PersonalProgramSummary[] {
    return this.programs;
  }
  ngOnInit(): void {
    merge(this.language.language$, this.reload$)
      .pipe(
        tap(() => {
          this.loading = true;
          this.message = '';
        }),
        switchMap(() =>
          this.service.listPage(this.page, this.pageSize, this.standalone, this.search).pipe(
            catchError((error) => {
              this.message = errorMessage(error, 'personalPrograms.loadError');
              return of({ content: [], totalElements: 0 });
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((programs) => {
        this.programs = programs.content;
        this.totalItems = programs.totalElements;
        this.loading = false;
      });
  }
  filtersChanged(): void {
    this.successMessage = '';
    this.page = 0;
    this.reload$.next();
  }
  changePage(page: number): void {
    this.successMessage = '';
    this.page = page - 1;
    this.reload$.next();
  }
  reload(): void {
    if (!this.loading && !this.busy) this.reload$.next();
  }

  askDelete(program: PersonalProgramSummary): void {
    if (this.busy || this.loading || this.pendingDelete) return;
    this.pendingDelete = program;
  }

  cancelDelete(): void {
    if (!this.busy) this.pendingDelete = null;
  }

  confirmDelete(): void {
    const program = this.pendingDelete;
    if (this.busy || this.loading || !program) return;
    this.busy = true;
    this.message = '';
    this.successMessage = '';
    this.service.delete(program.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busy = false;
        this.pendingDelete = null;
        this.successMessage = program.startedAt
          ? program.standalone ? 'personalWorkouts.archiveSuccess' : 'personalPrograms.archiveSuccess'
          : program.standalone ? 'personalWorkouts.deleteSuccess' : 'personalPrograms.deleteSuccess';
        // The last item on a page can leave that page empty after deletion.
        if (this.page > 0 && this.programs.length === 1) this.page--;
        this.reload$.next();
      },
      error: (error) => {
        this.busy = false;
        this.pendingDelete = null;
        this.message = errorMessage(error, 'personalPrograms.actionError');
      },
    });
  }

  private pendingCopy: { path: string; id: number } | null = null;
  get hasPendingCopy(): boolean { return this.pendingCopy !== null; }

  retryOpenCopy(): void {
    if (this.busy || !this.pendingCopy) return;
    this.busy = true;
    this.message = '';
    this.openPendingCopy();
  }

  private openPendingCopy(): void {
    const pending = this.pendingCopy;
    if (!pending) return;
    const finished = (opened: boolean) => {
      this.busy = false;
      if (opened) this.pendingCopy = null;
      else this.message = 'personalNavigation.openFailed';
    };
    void this.router.navigate([pending.path, pending.id]).then(finished, () => finished(false));
  }

  editCopy(program: PersonalProgramSummary): void {
    if (this.busy || this.loading || this.pendingDelete || this.pendingCopy || !program.startedAt) return;
    this.busy = true;
    this.message = '';
    this.successMessage = '';
    const request = program.standalone
      ? this.service.repeat(program.id).pipe(map((detail) => detail.id))
      : this.service.copy(program.id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (id) => {
        this.pendingCopy = {
          path: program.standalone ? '/user/personal-workouts' : '/user/personal-programs', id,
        };
        this.openPendingCopy();
      },
      error: (error) => {
        this.busy = false;
        this.message = errorMessage(error, 'personalPrograms.actionError');
      },
    });
  }
}
