import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, merge, of, switchMap, tap } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { PersonalProgramSummary } from '../../../../models/personal-program.model';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';

@Component({
  selector: 'app-personal-programs',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSearchComponent, PaginationComponent],
  templateUrl: './personal-programs.component.html',
})
export class PersonalProgramsComponent implements OnInit {
  private readonly service = inject(PersonalProgramService);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  programs: PersonalProgramSummary[] = [];
  private readonly reload$ = new Subject<void>();
  search = '';
  page = 0;
  readonly pageSize = 12;
  totalItems = 0;
  kind = 'all';
  loading = false;
  message = '';
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
          this.service.listPage(this.page, this.pageSize, this.kind === 'all' ? null : this.kind === 'standalone', this.search).pipe(
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
    this.page = 0;
    this.reload$.next();
  }
  changePage(page: number): void {
    this.page = page - 1;
    this.reload$.next();
  }
  reload(): void {
    if (!this.loading) this.reload$.next();
  }
}
