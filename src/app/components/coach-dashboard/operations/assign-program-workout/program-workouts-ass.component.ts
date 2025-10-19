import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachProgramBoardComponent } from '../../../shared/coach/coach-program-board/coach-program-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { Workout } from '../../../../models/workout.model';
import { CoachProgram } from '../../../../models/coach-program.model';

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

  constructor() {}

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
  // + a save funkció
  saveSelectedWorkouts() {
    if (!this.selectedProgramId) {
      console.warn('Nincs kiválasztott program!');
      return;
    }

    console.log('🚀 Mentés backendhez:', {
      programId: this.selectedProgramId,
      workoutIds: this.selectedWorkoutIds
    });

    // Itt lehet a backend hívás
    // this.programService.assignWorkoutsToProgram(this.selectedProgramId, this.selectedWorkoutIds).subscribe(...)
  }
  removeWorkout(wid: number) {
    // eltávolítás
    this.selectedWorkoutIds = this.selectedWorkoutIds.filter(id => id !== wid);

    // jelezzük a változást
    this.onWorkoutsChange(this.selectedWorkoutIds);
  }

}
