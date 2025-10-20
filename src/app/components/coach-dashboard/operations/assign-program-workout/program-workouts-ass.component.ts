import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachProgramBoardComponent } from '../../../shared/coach/coach-program-board/coach-program-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { Workout } from '../../../../models/workout.model';
import { CoachProgram } from '../../../../models/coach-program.model';
import { ProgramWorkoutService } from '../../../../services/coach/program-workout.service'; // 🔹 IMPORTÁLJUK A SERVICE-T

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

  // Wrapper szinten tárolt kiválasztott workoutok
  selectedWorkoutIds: number[] = [];

  @Output() assignedWorkouts = new EventEmitter<{ programId: number, workoutIds: number[] }>();

  constructor(private programWorkoutService: ProgramWorkoutService) {} // ✅ SERVICE INJEKCIÓ

  ngOnInit(): void {}

  // Program kiválasztás
  onProgramSelected(programId: number) {
    this.selectedProgramId = programId;
    console.log('Selected program in wrapper:', programId);

    // 🔹 Új program kiválasztásakor töröljük a korábbi kiválasztott workoutokat
    this.selectedWorkoutIds = [];
  }

  // Workout hozzáadása/törlése
  onWorkoutsChange(updatedIds: number[]) {
    if (!this.selectedProgramId) {
      console.warn('Program nincs kiválasztva!');
      return;
    }

    // Frissítjük a teljes tömböt a checkbox állapot alapján
    this.selectedWorkoutIds = [...updatedIds];

    console.log('Current assigned workouts for program', this.selectedProgramId, this.selectedWorkoutIds);

    // Küldjük a kiválasztott programhoz tartozó workoutokat
    this.assignedWorkouts.emit({
      programId: this.selectedProgramId,
      workoutIds: this.selectedWorkoutIds
    });
  }

  // 🔹 Mentés backendhez (Program-Workout kapcsolatok mentése)
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

    // 🔹 Backend hívás: minden workout mentése a kiválasztott programhoz
    this.selectedWorkoutIds.forEach((workoutId, index) => {
      this.programWorkoutService.addWorkoutToProgram(this.selectedProgramId!, workoutId, index).subscribe({
        next: res => console.log(`✅ Workout ${workoutId} mentve:`, res),
        error: err => console.error(`❌ Workout ${workoutId} mentése sikertelen:`, err)
      });
    });
  }

  // Workout eltávolítása a kiválasztott listából
  removeWorkout(wid: number) {
    this.selectedWorkoutIds = this.selectedWorkoutIds.filter(id => id !== wid);
    this.onWorkoutsChange(this.selectedWorkoutIds);
  }
}
