import { Component, OnDestroy, OnInit } from '@angular/core';

import { Subject, takeUntil } from 'rxjs';

import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-user-workouts-calendar',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './user-workouts-calendar.component.html',
  styleUrls: ['./user-workouts-calendar.component.css'],
})
export class UserWorkoutsCalendarComponent implements OnInit, OnDestroy {
  // =========================================================
  // DESTROY
  // =========================================================

  private readonly destroy$ = new Subject<void>();

  // =========================================================
  // Workout adatok
  // =========================================================

  scheduledWorkouts: any[] = [];

  selectedWorkout: any | null = null;

  selectedExercises: any[] = [];

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
    this.loadScheduledWorkouts();

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadScheduledWorkouts();

      if (this.selectedWorkout) {
        this.loadSelectedWorkoutExercises();
      }
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
          console.log('Scheduled workouts:', JSON.stringify(response, null, 2));

          if (response.success) {
            this.scheduledWorkouts = response.data ?? [];
          } else {
            this.scheduledWorkouts = [];
          }

          this.generateCalendar();
        },

        error: (err) => {
          console.error('Hiba az ütemezett workoutok lekérésekor:', err);

          this.scheduledWorkouts = [];

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

  getWorkoutsForDay(date: Date): any[] {
    return this.scheduledWorkouts.filter((workout) => {
      if (!workout.scheduledAt) {
        return false;
      }

      const scheduledDate = this.parseDate(workout.scheduledAt);

      return (
        scheduledDate.getFullYear() === date.getFullYear() &&
        scheduledDate.getMonth() === date.getMonth() &&
        scheduledDate.getDate() === date.getDate()
      );
    });
  }

  hasWorkoutsInCurrentMonth(): boolean {
    return this.calendarDays.some(
      (day) => day.currentMonth && this.getWorkoutsForDay(day.date).length > 0,
    );
  }

  // =========================================================
  // WORKOUT KIVÁLASZTÁSA
  // =========================================================

  selectWorkout(workout: any): void {
    this.selectedWorkout = workout;

    this.selectedExercises = [];

    console.log('Kiválasztott workout:', workout);

    this.loadSelectedWorkoutExercises();
  }

  // =========================================================
  // KIVÁLASZTOTT WORKOUT EXERCISE-AINAK BETÖLTÉSE
  // =========================================================

  private loadSelectedWorkoutExercises(): void {
    if (!this.selectedWorkout?.userWorkoutId) {
      this.selectedExercises = [];
      return;
    }

    this.workoutService
      .getExercisesForUserWorkout(this.selectedWorkout.userWorkoutId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exercises) => {
          console.log('Workout exercise-ok:', JSON.stringify(exercises, null, 2));

          this.selectedExercises = exercises ?? [];
        },

        error: (err) => {
          console.error('Hiba a workout exercise-ok lekérésekor:', err);

          this.selectedExercises = [];
        },
      });
  }

  // =========================================================
  // WORKOUT RÉSZLETEK BEZÁRÁSA
  // =========================================================

  closeWorkoutDetails(): void {
    this.selectedWorkout = null;

    this.selectedExercises = [];
  }

  // =========================================================
  // BACKEND DÁTUM FELDOLGOZÁSA
  // =========================================================

  private parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);

    return new Date(year, month - 1, day);
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
