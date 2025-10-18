import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { AssignProgramService, UserProgramDto } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService, UserNameId } from '../../../../services/user/user-name-id.service';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';
import { CoachProgramBoardComponent } from '../../../shared/coach/coach-program-board/coach-program-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { CoachProgram } from '../../../../models/coach-program.model';
import { Workout } from '../../../../models/workout.model';

@Component({
  selector: 'app-assignprogram',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    CoachProgramSelectComponent,
    CoachProgramBoardComponent,
    CoachWorkoutBoardComponent,
  ],
  templateUrl: './assignprogram.component.html'
})
export class AssignProgramComponent implements OnInit {
  private assignService = inject(AssignProgramService);
  private userNameIdService = inject(UserNameIdService);
  private programService = inject(CoachProgramService);

  userId!: number;
  selectedProgramId!: number;
  loading = false;
  message = '';
  success = false;
  assignedPrograms: UserProgramDto[] = [];
  users: UserNameId[] = [];
  programs: CoachProgram[] = [];

  workouts: Workout[] = [];

  ngOnInit() {
    this.loadAssignedPrograms();
    this.loadUsers();
    this.loadPrograms();
    this.loadWorkouts();
  }

  loadAssignedPrograms() {
    this.assignService.getMyAssignedPrograms().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.assignedPrograms = res.data;
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Hozzárendelt programok betöltése sikertelen', err);
        this.loading = false;
      },
    });
  }
  onAddWorkout(workout: Workout) {
    if (!this.selectedProgramId) {
      this.message = '❌ Kérlek, válassz programot!';
      this.success = false;
      return;
    }
  }

  loadPrograms() {
    this.loading = true;
    this.programService.getAllPrograms().subscribe({
      next: (programsFromService: any[]) => {
        this.loading = false;
        this.programs = programsFromService.map(p => ({
          programId: p.programId ?? p.id ?? 0,
          programName: p.programName ?? p.name ?? '',
          programDescription: p.programDescription ?? p.description ?? '',
          durationDays: p.durationDays ?? 0,
          difficultyLevel: p.difficultyLevel ?? 'unknown',
          workouts: p.workouts ?? [],
        }));
      },
      error: (err: any) => {
        this.loading = false;
        console.error('❌ Programok betöltése sikertelen', err);
      }
    });
  }

  loadUsers() {
    this.userNameIdService.getAllUsers().subscribe({
      next: (res: UserNameId[]) => {
        this.users = res;
      },
      error: (err: any) => {
        console.error('❌ Felhasználók betöltése sikertelen', err);
      },
    });
  }

  loadWorkouts() {
    const workoutService = inject(CoachWorkoutsService);
    workoutService.getMyWorkouts().subscribe({
      next: (res: any) => {
        this.workouts = res.workouts ?? [];
      },
      error: (err) => {
        console.error('❌ Workoutok betöltése sikertelen', err);
      }
    });
  }

  assignProgram() {
    if (!this.userId || !this.selectedProgramId) {
      this.message = '❌ Kérlek, válassz felhasználót és programot!';
      this.success = false;
      return;
    }

    this.loading = true;
    this.message = '';
    this.success = false;

    this.assignService.assignProgramToUser(this.userId, this.selectedProgramId).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.success = res.status === 'success';
        this.message = res.message || '✅ Program sikeresen hozzárendelve!';
        this.loadAssignedPrograms();
      },
      error: (err: any) => {
        this.loading = false;
        this.success = false;
        this.message = '❌ Hiba történt a hozzárendelés során.';
        console.error('❌ assignProgram API error:', err);
      },
    });
  }

  // ⚡ Workout hozzáadása a kiválasztott programkártyához
  onAddWorkoutToProgram(workout: Workout, programId: number) {
    if (!programId) {
      this.message = '❌ Hiba: Program nem lett kiválasztva!';
      this.success = false;
      return;
    }

    if (!workout.id) {
      this.message = '❌ Hiba: Workout ID hiányzik.';
      this.success = false;
      return;
    }

    this.programService.assignWorkoutToProgram(programId, workout.id).subscribe({
      next: (res: any) => {
        this.success = true;
        this.message = `✅ '${workout.name}' hozzáadva a programhoz!`;
        this.loadPrograms();
      },
      error: (err: any) => {
        this.success = false;
        this.message = '❌ Hiba történt a workout hozzárendelése során.';
        console.error('❌ assignWorkoutToProgram API error:', err);
      }
    });
  }
}
