import { Component, OnInit, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { AssignProgramService, UserProgramDto, ProgramDto } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService, UserNameId } from '../../../../services/user/user-name-id.service';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';

@Component({
  selector: 'app-assignprogram',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    CoachProgramSelectComponent,
  ],
  templateUrl: './assignprogram.component.html'
})
export class AssignProgramComponent implements OnInit {
  private assignService = inject(AssignProgramService);
  private userNameIdService = inject(UserNameIdService);
  private programService = inject(CoachProgramService);
  private workoutService = inject(CoachWorkoutsService);

  userId!: number;
  selectedProgramId!: number;
  loading = false;
  message = '';
  success = false;
  assignedPrograms: UserProgramDto[] = [];
  users: UserNameId[] = [];
  programs: ProgramDto[] = [];

  programDropListIds: string[] = [];

  ngOnInit() {
    this.loadAssignedPrograms();
    this.loadUsers();
    this.loadPrograms();
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

  loadPrograms() {
    this.programService.getAllPrograms().subscribe({
      next: (programsFromService: any[]) => {
        this.programs = programsFromService.map(p => ({
          programId: p.programId ?? p.id ?? 0,
          programName: p.programName ?? p.name ?? '',
          programDescription: p.programDescription ?? p.description ?? '',
          durationDays: p.durationDays ?? 0,
          difficultyLevel: p.difficultyLevel ?? 'unknown',
          workouts: p.workouts ?? [],
        })) as ProgramDto[];

        // 🔹 Frissítjük a dropList IDs-t, a child már megkapja a program ID-kat
        this.programDropListIds = this.programs
          .map(p => `program-${p.programId}`)
          .filter(id => !!id); // undefined értékek kiszűrése
      },
      error: (err: any) => console.error('❌ Programok betöltése sikertelen', err),
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

  get workoutBoardDropLists(): string[] {
    if (!this.programDropListIds || !this.programDropListIds.length) {
      return ['workout-list'];
    }
    // csak string-ek
    return ['workout-list', ...this.programDropListIds.filter((id): id is string => !!id)];
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
}
