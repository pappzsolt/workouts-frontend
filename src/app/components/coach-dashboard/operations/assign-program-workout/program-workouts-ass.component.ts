import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Subject, takeUntil } from 'rxjs';

import { MessageComponent } from '../../../shared/message/message.component';
import { CoachProgramBoardComponent } from '../../../shared/coach/coach-program-board/coach-program-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';

import { Workout } from '../../../../models/workout.model';
import { CoachProgram } from '../../../../models/coach-program.model';

import { ProgramWorkoutService } from '../../../../services/coach/program-workout.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-program-workouts-ass',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MessageComponent,
    CoachProgramBoardComponent,
    CoachWorkoutBoardComponent,
    AppIconComponent,
  ],
  templateUrl: './program-workouts-ass.component.html',
})
export class ProgramWorkoutsAssComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  programs: CoachProgram[] = [];

  workouts: Workout[] = [];

  selectedProgramId?: number;

  selectedWorkoutIds: number[] = [];

  message: string | null = null;

  messageStatus: 'success' | 'error' | 'info' | '' = '';

  @Output()
  assignedWorkouts = new EventEmitter<{
    programId: number;
    workoutIds: number[];
  }>();

  constructor(
    private programWorkoutService: ProgramWorkoutService,
    private languageService: LanguageService,
  ) {}

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      // Nyelvváltáskor itt lehet újratölteni az adatokat.
    });
  }

  // ==========================================================
  // PROGRAM SELECTION
  // ==========================================================

  onProgramSelected(programId: number): void {
    this.selectedProgramId = programId;
    this.selectedWorkoutIds = [];
  }

  // ==========================================================
  // WORKOUT SELECTION
  // ==========================================================

  onWorkoutsChange(updatedIds: number[]): void {
    if (!this.selectedProgramId) {
      this.message = 'Program nincs kiválasztva!';
      this.messageStatus = 'error';
      return;
    }

    this.selectedWorkoutIds = [...updatedIds];

    this.assignedWorkouts.emit({
      programId: this.selectedProgramId,
      workoutIds: this.selectedWorkoutIds,
    });
  }

  // ==========================================================
  // SAVE WORKOUTS
  // ==========================================================

  saveSelectedWorkouts(): void {
    if (!this.selectedProgramId) {
      this.message = 'Nincs kiválasztott program!';
      this.messageStatus = 'error';
      return;
    }

    if (this.selectedWorkoutIds.length === 0) {
      this.message = 'Nincsenek kiválasztott workoutok!';
      this.messageStatus = 'error';
      return;
    }

    this.selectedWorkoutIds.forEach((workoutId, index) => {
      this.programWorkoutService
        .addWorkoutToProgram(this.selectedProgramId!, workoutId, index)
        .subscribe({
          next: (res) => {
            this.message = res.message;
            this.messageStatus = res.success ? 'success' : 'error';

            setTimeout(() => {
              this.message = null;
              this.messageStatus = '';
            }, 5000);
          },

          error: (err) => {
            this.message = err.error?.message || 'Ismeretlen hiba';

            this.messageStatus = 'error';

            setTimeout(() => {
              this.message = null;
              this.messageStatus = '';
            }, 5000);
          },
        });
    });
  }

  // ==========================================================
  // REMOVE WORKOUT
  // ==========================================================

  removeWorkout(wid: number): void {
    if (!this.selectedProgramId) {
      this.message = 'Program nincs kiválasztva!';
      this.messageStatus = 'error';
      return;
    }

    this.selectedWorkoutIds = this.selectedWorkoutIds.filter((id) => id !== wid);

    this.programWorkoutService.deleteProgramWorkout(this.selectedProgramId, wid).subscribe({
      next: (res) => {
        this.message = res.message;
        this.messageStatus = res.success ? 'success' : 'error';

        setTimeout(() => {
          this.message = null;
          this.messageStatus = '';
        }, 5000);

        this.onWorkoutsChange(this.selectedWorkoutIds);
      },

      error: (err) => {
        this.message = err.error?.message || 'Ismeretlen hiba';

        this.messageStatus = 'error';

        setTimeout(() => {
          this.message = null;
          this.messageStatus = '';
        }, 5000);
      },
    });
  }

  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
