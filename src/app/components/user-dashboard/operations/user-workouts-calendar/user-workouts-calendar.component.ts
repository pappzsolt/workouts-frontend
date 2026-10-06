import { matchesSearch } from '../../../shared/components/app-search/search-match';
import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import type { CalendarDay } from '../../../../models/common/calendar-day.model';
import type { ScheduledWorkout } from '../../../../models/scheduled-workout/scheduled-workout.model';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../services/logger.service';

import { BehaviorSubject, Subject, combineLatest, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';

import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { UserWorkoutExerciseDto } from '../../../../models/user-workout-exercise.dto';
import { LanguageService } from '../../../../services/shared/language.service';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-workouts-calendar',
  standalone: true,
  imports: [AppSearchComponent, ...SHARED_IMPORTS],
  templateUrl: './user-workouts-calendar.component.html',
  styleUrls: ['./user-workouts-calendar.component.css'],
})
export class UserWorkoutsCalendarComponent implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);

  // =========================================================
  // DESTROY
  // =========================================================

  private readonly destroy$ = new Subject<void>();
  private readonly selectedWorkoutId$ = new BehaviorSubject<number | null>(null);

  // =========================================================
  // Workout adatok
  // =========================================================

  scheduledWorkouts: ScheduledWorkout[] = [];
  searchTerm = '';

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.rebuildWorkoutDateIndex();
  }

  /** Előre indexelt workoutok dátum szerint, hogy a template ne filterezze újra a teljes listát. */
  private workoutsByDate = new Map<string, ScheduledWorkout[]>();

  selectedWorkout: ScheduledWorkout | null = null;

  selectedExercises: UserWorkoutExerciseDto[] = [];

  // =========================================================
  // Naptár adatok
  // =========================================================

  currentYear: number;

  currentMonth: number;

  calendarDays: CalendarDay[] = [];

  monthNames: string[] = [
    'userWorkoutsCalendar.january',
    'userWorkoutsCalendar.february',
    'userWorkoutsCalendar.march',
    'userWorkoutsCalendar.april',
    'userWorkoutsCalendar.may',
    'userWorkoutsCalendar.june',
    'userWorkoutsCalendar.july',
    'userWorkoutsCalendar.august',
    'userWorkoutsCalendar.september',
    'userWorkoutsCalendar.october',
    'userWorkoutsCalendar.november',
    'userWorkoutsCalendar.december',
  ];

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private workoutService: WorkoutExercisesManagerService,
    private languageService: LanguageService,
  ) {
    const today = new Date();

    this.currentYear = today.getFullYear();

    this.currentMonth = today.getMonth();
  }

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadScheduledWorkouts();
    });

    combineLatest([
      this.selectedWorkoutId$,
      this.languageService.language$,
    ])
      .pipe(
        distinctUntilChanged(
          ([previousWorkoutId, previousLanguage], [currentWorkoutId, currentLanguage]) =>
            previousWorkoutId === currentWorkoutId && previousLanguage === currentLanguage,
        ),
        switchMap(([userWorkoutId]) =>
          userWorkoutId == null
            ? of([])
            : this.workoutService.getExercisesForUserWorkout(userWorkoutId),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (exercises) => {
          this.selectedExercises = exercises ?? [];
        },
        error: (err) => {
          this.logger.error('Hiba a workout exercise-ok lekérésekor:', err);
          this.selectedExercises = [];
        },
      });
  }

  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // WORKOUTOK BETÖLTÉSE
  // =========================================================

  private loadScheduledWorkouts(): void {
    this.workoutService
      .getScheduledWorkouts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {

          this.scheduledWorkouts = response.success ? (response.data ?? []) : [];
          this.rebuildWorkoutDateIndex();
          this.generateCalendar();
        },

        error: (err) => {
          this.logger.error('Hiba az ütemezett workoutok lekérésekor:', err);

          this.scheduledWorkouts = [];
          this.rebuildWorkoutDateIndex();
          this.generateCalendar();
        },
      });
  }

  // =========================================================
  // ELŐZŐ HÓNAP
  // =========================================================

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }

    this.generateCalendar();
  }

  // =========================================================
  // KÖVETKEZŐ HÓNAP
  // =========================================================

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }

    this.generateCalendar();
  }

  // =========================================================
  // NAPTÁR GENERÁLÁSA
  // =========================================================

  private generateCalendar(): void {
    this.calendarDays = [];

    const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);

    const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);

    let firstDayIndex = firstDayOfMonth.getDay();

    /*
     * JavaScript:
     *
     * vasárnap = 0
     * hétfő = 1
     *
     * A naptár hétfővel kezdődik.
     */
    if (firstDayIndex === 0) {
      firstDayIndex = 6;
    } else {
      firstDayIndex--;
    }

    // =======================================================
    // ELŐZŐ HÓNAP NAPJAI
    // =======================================================

    const previousMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const date = new Date(this.currentYear, this.currentMonth - 1, previousMonthLastDay - i);

      this.calendarDays.push({
        date,
        currentMonth: false,
        isToday: this.isToday(date),
      });
    }

    // =======================================================
    // AKTUÁLIS HÓNAP NAPJAI
    // =======================================================

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);

      this.calendarDays.push({
        date,
        currentMonth: true,
        isToday: this.isToday(date),
      });
    }

    // =======================================================
    // KÖVETKEZŐ HÓNAP NAPJAI
    // =======================================================

    let nextMonthDay = 1;

    while (this.calendarDays.length % 7 !== 0) {
      const date = new Date(this.currentYear, this.currentMonth + 1, nextMonthDay++);

      this.calendarDays.push({
        date,
        currentMonth: false,
        isToday: this.isToday(date),
      });
    }
  }

  // =========================================================
  // WORKOUTOK LEKÉRÉSE ADOTT NAPRA
  // =========================================================

  getWorkoutsForDay(date: Date): ScheduledWorkout[] {
    return this.workoutsByDate.get(this.toDateKey(date)) ?? [];
  }

  hasWorkoutsInCurrentMonth(): boolean {
    return this.calendarDays.some(
      (day) => day.currentMonth && this.workoutsByDate.has(this.toDateKey(day.date)),
    );
  }

  trackByCalendarDay = (_index: number, day: CalendarDay): string => {
    return this.toDateKey(day.date);
  };

  trackByWorkout(index: number, workout: ScheduledWorkout): number {
    return workout.userWorkoutId ?? index;
  }

  trackByExercise(index: number, exercise: { id?: number }): number {
    return exercise.id ?? index;
  }

  private rebuildWorkoutDateIndex(): void {
    this.workoutsByDate.clear();

    for (const workout of this.scheduledWorkouts) {
      if (!workout.scheduledAt || !matchesSearch(this.searchTerm, workout.workoutName)) {
        continue;
      }

      const key = workout.scheduledAt.slice(0, 10);
      const workouts = this.workoutsByDate.get(key);

      if (workouts) {
        workouts.push(workout);
      } else {
        this.workoutsByDate.set(key, [workout]);
      }
    }
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // =========================================================
  // WORKOUT KIVÁLASZTÁSA
  // =========================================================

  selectWorkout(workout: ScheduledWorkout): void {
    this.selectedWorkout = workout;
    this.selectedExercises = [];
    this.selectedWorkoutId$.next(workout.userWorkoutId ?? null);
  }

  // =========================================================
  // KIVÁLASZTOTT WORKOUT EXERCISE-AINAK BETÖLTÉSE
  // =========================================================


  // =========================================================
  // WORKOUT RÉSZLETEK BEZÁRÁSA
  // =========================================================

  closeWorkoutDetails(): void {
    this.selectedWorkout = null;
    this.selectedExercises = [];
    this.selectedWorkoutId$.next(null);
  }


  // =========================================================
  // MAI NAP ELLENŐRZÉSE
  // =========================================================

  private isToday(date: Date): boolean {
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }
}
