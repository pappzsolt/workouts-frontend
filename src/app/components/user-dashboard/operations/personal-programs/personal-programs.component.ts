import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, merge, of, switchMap, tap } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import { matchesSearch } from '../../../shared/components/app-search/search-match';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { PersonalProgramSummary } from '../../../../models/personal-program.model';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';

@Component({
  selector: 'app-personal-programs',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSearchComponent],
  templateUrl: './personal-programs.component.html',
})
export class PersonalProgramsComponent implements OnInit {
  private readonly service = inject(PersonalProgramService);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  programs: PersonalProgramSummary[] = [];
  private readonly reload$ = new Subject<void>();
  search = '';
  loading = false;
  message = '';
  get filtered(): PersonalProgramSummary[] {
    return this.programs.filter((program) => matchesSearch(this.search, program.name));
  }
  ngOnInit(): void {
    merge(this.language.language$, this.reload$)
      .pipe(
        tap(() => {
          this.loading = true;
          this.message = '';
        }),
        switchMap(() =>
          this.service.list().pipe(
            catchError((error) => {
              this.message = errorMessage(error, 'personalPrograms.loadError');
              return of([]);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((programs) => {
        this.programs = programs;
        this.loading = false;
      });
  }
  reload(): void {
    if (!this.loading) this.reload$.next();
  }
}
