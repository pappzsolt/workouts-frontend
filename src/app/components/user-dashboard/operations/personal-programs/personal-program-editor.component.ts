import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { Observable, Subject, catchError, of, switchMap, tap } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { ExercisePickerComponent } from '../../../coach/exercise-picker/exercise-picker.component';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { LanguageService } from '../../../../services/shared/language.service';
import {
  PersonalProgramDay,
  PersonalProgramDetail,
  PersonalProgramRequest,
} from '../../../../models/personal-program.model';
import { CoachExerciseSearchItem } from '../../../../models/coach-workspace.model';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';

@Component({
  selector: 'app-personal-program-editor',
  standalone: true,
  imports: [...SHARED_IMPORTS, ExercisePickerComponent],
  templateUrl: './personal-program-editor.component.html',
})
export class PersonalProgramEditorComponent implements OnInit {
  private readonly service = inject(PersonalProgramService);
  private readonly catalogue = inject(ExerciseService);
  private readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  id: number | null = null;
  started = false;
  loading = false;
  loadFailed = false;
  busy = false;
  dirty = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  action: 'start' | 'delete' | 'copy' | 'repeat' | 'leave' | null = null;
  pickerDay: PersonalProgramDay | null = null;
  names: Record<number, string> = {};
  catalogueFailed = false;
  private leaveResult?: Subject<boolean>;
  standaloneMode = !!this.route.snapshot?.data?.['standalone'];
  model: PersonalProgramRequest = this.empty();

  private empty(): PersonalProgramRequest {
    return {
      name: '',
      description: null,
      durationDays: this.standaloneMode ? 1 : 7,
      startDate: null,
      difficultyLevel: null,
      languageCode: this.language.getCurrentLanguage(),
      workouts: this.standaloneMode
        ? [{ dayIndex: 1, name: '', description: null, exercises: [] }]
        : [],
    };
  }
  ngOnInit(): void {
    this.language.language$
      .pipe(
        tap(() => {
          this.pickerDay = null;
        }),
        switchMap(() => this.catalogue.getAllExercises().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.catalogueFailed = !response?.success;
        if (response?.success)
          this.names = Object.fromEntries(
            (response.data ?? []).filter((e) => e.id != null).map((e) => [e.id!, e.name]),
          );
      });
    this.route.paramMap
      .pipe(
        tap((params) => {
          const value = params.get('id');
          this.id = value == null ? null : Number(value);
          this.dirty = false;
          this.started = false;
          this.pickerDay = null;
          this.loadFailed = false;
          this.message = '';
          this.loading = true;
        }),
        switchMap(() =>
          this.id == null
            ? of(null)
            : this.service.get(this.id).pipe(
                catchError((error) => {
                  this.loadFailed = true;
                  this.fail(error);
                  return of(null);
                }),
              ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((detail) => {
        this.loading = false;
        if (detail) {
          this.standaloneMode = !!detail.standalone;
          this.model = detail.program;
          this.started = detail.startedAt != null;
        } else if (!this.loadFailed) this.model = this.empty();
      });
    this.destroyRef.onDestroy(() => {
      this.leaveResult?.next(false);
      this.leaveResult?.complete();
    });
  }
  get locked(): boolean {
    return this.busy || this.started || this.loading || this.loadFailed;
  }
  get canStart(): boolean {
    return (
      this.id != null &&
      !this.dirty &&
      !this.locked &&
      this.withinLimits &&
      this.model.workouts.length > 0 &&
      this.model.workouts.every((day) => day.exercises.length > 0)
    );
  }
  get withinLimits(): boolean {
    const exercises = this.model.workouts.flatMap((day) => day.exercises);
    return (
      exercises.length <= 1000 &&
      exercises.reduce((sum, exercise) => sum + exercise.sets, 0) <= 5000
    );
  }
  get chosenIds(): number[] {
    return this.pickerDay?.exercises.map((e) => e.exerciseId) ?? [];
  }
  changed(): void {
    this.dirty = true;
    this.message = '';
  }
  addDay(): void {
    if (this.standaloneMode || this.locked || this.model.workouts.length >= 366) return;
    const used = new Set(this.model.workouts.map((day) => day.dayIndex));
    let index = 1;
    while (used.has(index) && index <= this.model.durationDays) index++;
    if (index > this.model.durationDays) {
      this.message = 'personalPrograms.noFreeDay';
      this.messageType = 'info';
      return;
    }
    this.model.workouts.push({ dayIndex: index, name: '', description: null, exercises: [] });
    this.changed();
  }
  removeDay(day: PersonalProgramDay): void {
    if (this.standaloneMode || this.locked) return;
    this.model.workouts = this.model.workouts.filter((item) => item !== day);
    if (this.pickerDay === day) this.pickerDay = null;
    this.changed();
  }
  addExercise(exercise: CoachExerciseSearchItem): void {
    if (
      !this.pickerDay ||
      this.locked ||
      this.chosenIds.includes(exercise.id) ||
      this.pickerDay.exercises.length >= 100
    )
      return;
    this.names[exercise.id] = exercise.name;
    this.pickerDay.exercises.push({
      exerciseId: exercise.id,
      sets: 3,
      repetitions: 10,
      restSeconds: 60,
      notes: null,
    });
    this.changed();
  }
  removeExercise(day: PersonalProgramDay, index: number): void {
    if (this.locked) return;
    day.exercises.splice(index, 1);
    this.changed();
  }
  moveExercise(day: PersonalProgramDay, index: number, direction: number): void {
    const target = index + direction;
    if (this.locked || target < 0 || target >= day.exercises.length) return;
    [day.exercises[index], day.exercises[target]] = [day.exercises[target], day.exercises[index]];
    this.changed();
  }
  save(form: NgForm): void {
    if (this.locked || form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    const days = this.model.workouts.map((day) => day.dayIndex);
    if (new Set(days).size !== days.length || days.some((day) => day > this.model.durationDays)) {
      this.message = 'personalPrograms.invalidDays';
      this.messageType = 'error';
      return;
    }
    if (!this.withinLimits) {
      this.message = 'personalPrograms.sizeLimit';
      this.messageType = 'error';
      return;
    }
    this.busy = true;
    this.message = '';
    const request = {
      ...this.model,
      ...(this.standaloneMode
        ? {
            durationDays: 1,
            workouts: [
              {
                ...this.model.workouts[0],
                dayIndex: 1,
                name: this.model.name,
                description: this.model.description,
              },
            ],
          }
        : {}),
      startDate: this.model.startDate || null,
      difficultyLevel: this.model.difficultyLevel || null,
    };
    this.service
      .save(this.id, request, this.standaloneMode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.busy = false;
          this.dirty = false;
          this.message = this.label('saved');
          this.messageType = 'success';
          if (this.id == null)
            void this.router.navigate(
              [
                this.standaloneMode ? '/user/personal-workouts' : '/user/personal-programs',
                typeof result === 'number' ? result : result.id,
              ],
              { replaceUrl: true },
            );
          else if (typeof result !== 'number') {
            this.model = result.program;
            this.started = result.startedAt != null;
            this.pickerDay = null;
          }
        },
        error: (error) => {
          this.busy = false;
          this.fail(error);
        },
      });
  }
  ask(action: 'start' | 'delete' | 'copy' | 'repeat'): void {
    if (this.busy || this.id == null || this.loading || this.loadFailed) return;
    if (action === 'start' && !this.canStart) return;
    if (action === 'delete' && this.started) return;
    if (action === 'copy' && this.dirty) return;
    if (action === 'repeat' && (!this.standaloneMode || !this.started || this.dirty)) return;
    this.action = action;
  }
  confirm(): void {
    if (this.action === 'leave') {
      this.dirty = false;
      this.finishLeave(true);
      return;
    }
    if (this.id == null || this.busy || this.action == null) return;
    const action = this.action;
    const request: Observable<number | PersonalProgramDetail> =
      action === 'repeat'
        ? this.service.repeat(this.id)
        : action === 'start'
          ? this.service.start(this.id)
          : action === 'copy'
            ? this.service.copy(this.id)
            : this.service.delete(this.id);
    this.busy = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.busy = false;
        this.action = null;
        this.dirty = false;
        if (action === 'start' && typeof result !== 'number') {
          this.model = result.program;
          this.started = result.startedAt != null;
          this.pickerDay = null;
          this.message = this.label('startSuccess');
          this.messageType = 'success';
        } else
          void this.router.navigate(
            action === 'repeat' && typeof result !== 'number'
              ? ['/user/personal-workouts', result.id]
              : action === 'copy'
                ? [
                    this.standaloneMode ? '/user/personal-workouts' : '/user/personal-programs',
                    result,
                  ]
                : ['/user/personal-programs'],
          );
      },
      error: (error) => {
        this.busy = false;
        this.action = null;
        this.fail(error);
      },
    });
  }
  cancel(): void {
    if (this.busy) return;
    if (this.action === 'leave') this.finishLeave(false);
    else this.action = null;
  }
  canLeave(): boolean | Observable<boolean> {
    if (this.busy) return false;
    if (!this.dirty) return true;
    this.action = 'leave';
    this.leaveResult ??= new Subject<boolean>();
    return this.leaveResult.asObservable();
  }
  private finishLeave(result: boolean): void {
    this.action = null;
    this.leaveResult?.next(result);
    this.leaveResult?.complete();
    this.leaveResult = undefined;
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty || this.busy) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  label(key: string): string {
    return `${this.standaloneMode ? 'personalWorkouts' : 'personalPrograms'}.${key}`;
  }
  get confirmationTitle(): string {
    return this.action === 'leave'
      ? 'personalPrograms.leaveTitle'
      : this.label(`${this.action}Title`);
  }
  get confirmationMessage(): string {
    return this.action === 'leave'
      ? 'personalPrograms.leaveConfirm'
      : this.label(`${this.action}Confirm`);
  }
  private fail(error: unknown): void {
    this.message = errorMessage(error, 'personalPrograms.actionError');
    this.messageType = 'error';
  }
}
