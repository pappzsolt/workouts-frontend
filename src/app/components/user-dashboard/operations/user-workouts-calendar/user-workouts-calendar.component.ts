import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-user-workouts-calendar',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './user-workouts-calendar.component.html',
  styleUrls: ['./user-workouts-calendar.component.css']
})
export class UserWorkoutsCalendarComponent implements OnInit {

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
    'Január',
    'Február',
    'Március',
    'Április',
    'Május',
    'Június',
    'Július',
    'Augusztus',
    'Szeptember',
    'Október',
    'November',
    'December'
  ];


  // =========================================================
  // Constructor
  // =========================================================

  constructor(
    private workoutService: WorkoutExercisesManagerService
  ) {

    const today = new Date();

    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();

    this.generateCalendar();
  }


  // =========================================================
  // Angular lifecycle
  // =========================================================

  ngOnInit(): void {
    this.loadScheduledWorkouts();
  }


  // =========================================================
  // Workoutok betöltése
  // =========================================================

  loadScheduledWorkouts(): void {

    this.workoutService
      .getScheduledWorkouts()
      .subscribe({

        next: workouts => {

          console.log(
            'Scheduled workouts:',
            JSON.stringify(workouts, null, 2)
          );

          this.scheduledWorkouts = workouts ?? [];

          this.generateCalendar();
        },

        error: err => {

          console.error(
            'Hiba az ütemezett workoutok lekérésekor:',
            err
          );

          this.scheduledWorkouts = [];
        }

      });
  }


  // =========================================================
  // Előző hónap
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
  // Következő hónap
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
  // Naptár generálása
  // =========================================================

  private generateCalendar(): void {

    this.calendarDays = [];

    const firstDayOfMonth = new Date(
      this.currentYear,
      this.currentMonth,
      1
    );

    const lastDayOfMonth = new Date(
      this.currentYear,
      this.currentMonth + 1,
      0
    );

    // JavaScript:
    // vasárnap = 0
    // hétfő = 1

    let firstDayIndex = firstDayOfMonth.getDay();

    if (firstDayIndex === 0) {

      firstDayIndex = 6;

    } else {

      firstDayIndex--;
    }


    // =======================================================
    // Előző hónap napjai
    // =======================================================

    const previousMonthLastDay = new Date(
      this.currentYear,
      this.currentMonth,
      0
    ).getDate();

    for (
      let i = firstDayIndex - 1;
      i >= 0;
      i--
    ) {

      const date = new Date(
        this.currentYear,
        this.currentMonth - 1,
        previousMonthLastDay - i
      );

      this.calendarDays.push({
        date,
        currentMonth: false,
        isToday: this.isToday(date)
      });
    }


    // =======================================================
    // Aktuális hónap napjai
    // =======================================================

    for (
      let day = 1;
      day <= lastDayOfMonth.getDate();
      day++
    ) {

      const date = new Date(
        this.currentYear,
        this.currentMonth,
        day
      );

      this.calendarDays.push({
        date,
        currentMonth: true,
        isToday: this.isToday(date)
      });
    }


    // =======================================================
    // Következő hónap napjai
    // =======================================================

    let nextMonthDay = 1;

    while (this.calendarDays.length % 7 !== 0) {

      const date = new Date(
        this.currentYear,
        this.currentMonth + 1,
        nextMonthDay++
      );

      this.calendarDays.push({
        date,
        currentMonth: false,
        isToday: this.isToday(date)
      });
    }
  }


  // =========================================================
  // Workoutok lekérése adott napra
  // =========================================================

  getWorkoutsForDay(date: Date): any[] {

    return this.scheduledWorkouts.filter(workout => {

      if (!workout.scheduled_at) {
        return false;
      }

      const scheduledDate = this.parseDate(
        workout.scheduled_at
      );

      return (
        scheduledDate.getFullYear() === date.getFullYear() &&
        scheduledDate.getMonth() === date.getMonth() &&
        scheduledDate.getDate() === date.getDate()
      );
    });
  }


  // =========================================================
  // Dátum nélküli workoutok
  // =========================================================



  // =========================================================
  // Workout kiválasztása
  // =========================================================

  selectWorkout(workout: any): void {

    this.selectedWorkout = workout;

    this.selectedExercises = [];

    console.log(
      'Kiválasztott workout:',
      workout
    );

    this.workoutService
      .getExercisesForUserWorkout(
        workout.user_workout_id
      )
      .subscribe({

        next: exercises => {

          console.log(
            'Workout exercise-ok:',
            JSON.stringify(exercises, null, 2)
          );

          this.selectedExercises = exercises ?? [];
        },

        error: err => {

          console.error(
            'Hiba a workout exercise-ok lekérésekor:',
            err
          );

          this.selectedExercises = [];
        }

      });
  }


  // =========================================================
  // Workout részletek bezárása
  // =========================================================

  closeWorkoutDetails(): void {

    this.selectedWorkout = null;
    this.selectedExercises = [];
  }


  // =========================================================
  // Backend dátum feldolgozása
  // =========================================================

  private parseDate(dateString: string): Date {

    const [year, month, day] =
      dateString.split('-').map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }


  // =========================================================
  // Mai nap ellenőrzése
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
