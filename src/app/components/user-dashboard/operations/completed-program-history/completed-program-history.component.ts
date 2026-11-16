import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, switchMap, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LanguageService } from '../../../../services/shared/language.service';
import {
  CompletedProgram, CompletedProgramWorkout, CompletedProgramHistoryService,
} from '../../../../services/user/completed-program-history.service';
import { UserExerciseDetailService } from '../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { UserWorkoutDetailDto } from '../../../../models/user-workout-exercise-detail.dto';

/** Archive is a pure read-only view: no editing routes, no POST/PATCH/PUT/DELETE calls. */
@Component({
  selector: 'app-completed-program-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './completed-program-history.component.html',
})
export class CompletedProgramHistoryComponent implements OnInit, OnDestroy {
  private readonly archive = inject(CompletedProgramHistoryService);
  private readonly exerciseService = inject(UserExerciseDetailService);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private workoutsRequest?: Subscription;
  private detailRequest?: Subscription;

  programs: CompletedProgram[] = [];
  workouts: CompletedProgramWorkout[] = [];
  detail: UserWorkoutDetailDto | null = null;
  selectedProgram: CompletedProgram | null = null;
  selectedWorkout: CompletedProgramWorkout | null = null;
  search = '';
  loading = true;
  loadingWorkouts = false;
  loadingDetail = false;
  error = false;
  currentLanguage = 'hu';

  get visiblePrograms(): CompletedProgram[] {
    const term = this.search.trim().toLocaleLowerCase();
    return !term ? this.programs : this.programs.filter(program =>
      `${program.name ?? ''} ${program.description ?? ''}`.toLocaleLowerCase().includes(term));
  }

  ngOnInit(): void {
    this.language.language$.pipe(
      switchMap(language => {
        this.currentLanguage = language;
        this.workoutsRequest?.unsubscribe();
        this.detailRequest?.unsubscribe();
        this.selectedProgram = null;
        this.selectedWorkout = null;
        this.detail = null;
        this.workouts = [];
        this.loading = true;
        this.error = false;
        return this.archive.getCompletedPrograms(language);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: response => {
        this.loading = false;
        this.error = !response.success;
        this.programs = response.success ? (response.data ?? []) : [];
      },
      error: () => { this.loading = false; this.error = true; this.programs = []; },
    });
  }

  selectProgram(program: CompletedProgram): void {
    this.workoutsRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
    this.selectedProgram = program;
    this.selectedWorkout = null;
    this.detail = null;
    this.workouts = [];
    this.error = false;
    this.loadingWorkouts = true;
    this.loadingDetail = false;
    this.workoutsRequest = this.archive.getWorkouts(program.id, this.currentLanguage)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.loadingWorkouts = false;
          this.error = !response.success;
          this.workouts = response.success ? (response.data ?? []) : [];
        },
        error: () => { this.loadingWorkouts = false; this.error = true; },
      });
  }

  selectWorkout(workout: CompletedProgramWorkout): void {
    this.detailRequest?.unsubscribe();
    this.selectedWorkout = workout;
    this.detail = null;
    this.error = false;
    this.loadingDetail = true;
    this.detailRequest = this.exerciseService.getWorkoutExercises(workout.userWorkoutId, this.currentLanguage)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.loadingDetail = false;
          this.error = !response.success;
          this.detail = response.success ? response.data : null;
        },
        error: () => { this.loadingDetail = false; this.error = true; },
      });
  }

  backToPrograms(): void {
    this.workoutsRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
    this.selectedProgram = null;
    this.selectedWorkout = null;
    this.detail = null;
    this.workouts = [];
    this.error = false;
  }

  backToWorkouts(): void {
    this.detailRequest?.unsubscribe();
    this.selectedWorkout = null;
    this.detail = null;
    this.error = false;
  }

  ngOnDestroy(): void {
    this.workoutsRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
  }
}
