import { WORKOUT_PRESCRIPTION_LIMITS } from '../../../../models/workout-prescription-limits';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { ExercisePickerComponent } from '../../../coach/exercise-picker/exercise-picker.component';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { PersonalProgramState } from './personal-program-state';
import { PersonalProgramDays } from './personal-program-days';
import { PersonalProgramActions } from './personal-program-actions';
import { PersonalProgramNavigation } from './personal-program-navigation';

@Component({
  selector: 'app-personal-program-editor',
  standalone: true,
  imports: [...SHARED_IMPORTS, ExercisePickerComponent],
  templateUrl: './personal-program-editor.component.html',
})
export class PersonalProgramEditorComponent implements OnInit {
  readonly prescriptionLimits = WORKOUT_PRESCRIPTION_LIMITS;

  private readonly service = inject(PersonalProgramService);

  private readonly catalogue = inject(ExerciseService);

  private readonly language = inject(LanguageService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  readonly state = new PersonalProgramState(
    !!this.route.snapshot?.data?.['standalone'], this.language.getCurrentLanguage(),
  );
  readonly days = new PersonalProgramDays(this.state);
  readonly navigation = new PersonalProgramNavigation(this.state);
  readonly actions = new PersonalProgramActions(
    this.state, this.days, this.navigation, this.service, this.router, this.destroyRef,
  );

  ngOnInit(): void {
    this.language.language$
      .pipe(
        tap(() => {
          this.days.pickerDay = null;
        }),
        switchMap(() => this.catalogue.getAllExercises().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.days.catalogueFailed = !response?.success;
        if (response?.success)
          this.days.names = Object.fromEntries(
            (response.data ?? []).filter((e) => e.id != null).map((e) => [e.id!, e.name]),
          );
      });
    this.route.paramMap
      .pipe(
        tap((params) => {
          const value = params.get('id');
          this.state.id = value == null ? null : Number(value);
          this.state.dirty = false;
          this.state.started = false;
          this.days.pickerDay = null;
          this.state.loadFailed = false;
          this.state.message = '';
          this.state.loading = true;
        }),
        switchMap(() =>
          this.state.id == null
            ? of(null)
            : this.service.get(this.state.id).pipe(
                catchError((error) => {
                  this.state.loadFailed = true;
                  this.state.fail(error);
                  return of(null);
                }),
              ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((detail) => {
        this.state.loading = false;
        if (detail) {
          this.state.standaloneMode = !!detail.standalone;
          this.state.model = detail.program;
          this.state.started = detail.startedAt != null;
        } else if (!this.state.loadFailed) this.state.model = this.state.empty(this.language.getCurrentLanguage());
      });
    this.destroyRef.onDestroy(() => {
      this.navigation.destroy();
    });
  }

  canLeave(): boolean | Observable<boolean> {
    return this.navigation.canLeave();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    this.navigation.beforeUnload(event);
  }

}
