import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppCheckboxDirective } from '../../../shared/components/form-controls/app-check.directive';
import { AppPageHeaderComponent } from '../../../shared/components/app-page-header/app-page-header.component';
import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { AppLoadingComponent } from '../../../shared/components/app-state/app-state.component';
import { AppEmptyStateComponent } from '../../../shared/components/app-state/app-state.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { AppCardBannerComponent } from '../../../shared/components/app-card-banner/app-card-banner.component';
import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import { matchesSearch } from '../../../shared/components/app-search/search-match';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { WorkoutTemplate } from '../../../../models/workout-template.model';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';

@Component({
  selector: 'app-workout-templates',
  standalone: true,
  imports: [
    AppCheckboxDirective,
    AppPageHeaderComponent,
    AppHeadingDirective,
    AppLoadingComponent,
    AppEmptyStateComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    TranslatePipe,
    ConfirmDialogComponent,
    MessageComponent,
    AppCardComponent,
    AppCardBannerComponent,
    AppSearchComponent,
  ],
  templateUrl: './workout-templates.component.html',
})
export class WorkoutTemplatesComponent implements OnInit {
  private readonly service = inject(PersonalProgramService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  templates: WorkoutTemplate[] = [];
  search = '';
  favoritesOnly = false;
  loading = false;
  busy = false;
  message = '';
  loadFailed = false;
  pendingDelete: WorkoutTemplate | null = null;

  get filtered(): WorkoutTemplate[] {
    return this.templates
      .filter(
        (t) => (!this.favoritesOnly || t.favorite) && matchesSearch(this.search, t.program.name),
      )
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.id - a.id);
  }
  ngOnInit(): void {
    this.reload();
  }
  reload(): void {
    if (this.loading || this.busy) return;
    this.loading = true;
    this.message = '';
    this.loadFailed = false;
    this.service
      .listTemplates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (templates) => {
          this.templates = templates;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.loadFailed = true;
          this.fail(error);
        },
      });
  }
  favorite(template: WorkoutTemplate): void {
    if (this.busy || this.loading) return;
    this.busy = true;
    this.message = '';
    this.service
      .favoriteTemplate(template.id, !template.favorite)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.templates = this.templates.map((t) => (t.id === updated.id ? updated : t));
          this.busy = false;
        },
        error: (error) => {
          this.busy = false;
          this.fail(error);
        },
      });
  }
  use(template: WorkoutTemplate): void {
    if (this.busy || this.loading) return;
    this.busy = true;
    this.message = '';
    this.service
      .useTemplate(template.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (draft) => {
          // Keep the action locked until navigation completes to avoid duplicate occasions.
          void this.router.navigate(['/user/personal-workouts', draft.id]).then(
            () => {
              this.busy = false;
            },
            (error) => {
              this.busy = false;
              this.fail(error);
            },
          );
        },
        error: (error) => {
          this.busy = false;
          this.fail(error);
        },
      });
  }
  confirmDelete(): void {
    if (this.busy || !this.pendingDelete) return;
    const id = this.pendingDelete.id;
    this.busy = true;
    this.message = '';
    this.service
      .deleteTemplate(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.templates = this.templates.filter((t) => t.id !== id);
          this.busy = false;
          this.pendingDelete = null;
        },
        error: (error) => {
          this.busy = false;
          this.pendingDelete = null;
          this.fail(error);
        },
      });
  }
  private fail(error: unknown): void {
    this.message = errorMessage(error, 'personalPrograms.actionError');
  }
}
