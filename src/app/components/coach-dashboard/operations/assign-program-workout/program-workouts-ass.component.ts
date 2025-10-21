import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachProgramBoardComponent } from '../../../shared/coach/coach-program-board/coach-program-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { Workout } from '../../../../models/workout.model';
import { CoachProgram } from '../../../../models/coach-program.model';
import { ProgramWorkoutService } from '../../../../services/coach/program-workout.service';

@Component({
  selector: 'app-program-workouts-ass',
  standalone: true,
  imports: [CommonModule, FormsModule, CoachProgramBoardComponent, CoachWorkoutBoardComponent],
  templateUrl: './program-workouts-ass.component.html',
})
export class ProgramWorkoutsAssComponent implements OnInit {

  programs: CoachProgram[] = [];
  workouts: Workout[] = [];

  selectedProgramId?: number;

  selectedWorkoutIds: number[] = [];

  message: string | null = null;
  messageStatus: 'success' | 'error' | null = null;

  @Output() assignedWorkouts = new EventEmitter<{ programId: number, workoutIds: number[] }>();

  constructor(private programWorkoutService: ProgramWorkoutService) {}

  ngOnInit(): void {}

  onProgramSelected(programId: number) {
    this.selectedProgramId = programId;
    console.log('Selected program in wrapper:', programId);
    this.selectedWorkoutIds = [];
  }

  onWorkoutsChange(updatedIds: number[]) {
    if (!this.selectedProgramId) {
      console.warn('Program nincs kiválasztva!');
      return;
    }

    this.selectedWorkoutIds = [...updatedIds];

    console.log('Current assigned workouts for program', this.selectedProgramId, this.selectedWorkoutIds);

    this.assignedWorkouts.emit({
      programId: this.selectedProgramId,
      workoutIds: this.selectedWorkoutIds
    });
  }

  saveSelectedWorkouts() {
    if (!this.selectedProgramId) {
      console.warn('Nincs kiválasztott program!');
      return;
    }

    if (this.selectedWorkoutIds.length === 0) {
      console.warn('Nincsenek kiválasztott workoutok!');
      return;
    }

    console.log('🚀 Mentés backendhez:', {
      programId: this.selectedProgramId,
      workoutIds: this.selectedWorkoutIds
    });

    this.selectedWorkoutIds.forEach((workoutId, index) => {
      this.programWorkoutService.addWorkoutToProgram(this.selectedProgramId!, workoutId, index).subscribe({
        next: res => {
          console.log(`✅ Workout ${workoutId} mentve:`, res);
          this.message = res.message;
          this.messageStatus = res.status === 'success' ? 'success' : 'error';
          setTimeout(() => { this.message = null; this.messageStatus = null; }, 5000);
        },
        error: err => {
          console.error(`❌ Workout ${workoutId} mentése sikertelen:`, err);
          this.message = err.error?.message || 'Ismeretlen hiba';
          this.messageStatus = 'error';
          setTimeout(() => { this.message = null; this.messageStatus = null; }, 5000);
        }
      });
    });
  }

  removeWorkout(wid: number) {
    if (!this.selectedProgramId) {
      console.warn('Program nincs kiválasztva!');
      return;
    }

    this.selectedWorkoutIds = this.selectedWorkoutIds.filter(id => id !== wid);

    this.programWorkoutService.deleteProgramWorkout(this.selectedProgramId, wid).subscribe({
      next: res => {
        console.log(`✅ Workout ${wid} törölve a programból:`, res);
        this.message = res.message;
        this.messageStatus = res.status === 'success' ? 'success' : 'error';
        setTimeout(() => { this.message = null; this.messageStatus = null; }, 5000);

        this.onWorkoutsChange(this.selectedWorkoutIds);
      },
      error: err => {
        console.error(`❌ Workout ${wid} törlése sikertelen:`, err);
        this.message = err.error?.message || 'Ismeretlen hiba';
        this.messageStatus = 'error';
        setTimeout(() => { this.message = null; this.messageStatus = null; }, 5000);
      }
    });
  }

}
