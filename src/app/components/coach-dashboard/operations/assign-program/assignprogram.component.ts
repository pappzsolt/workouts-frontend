import { Component, OnInit, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AssignProgramService, UserProgramDto, ProgramDto } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService, UserNameId } from '../../../../services/user/user-name-id.service';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { CoachProgramBoardComponent } from '../../../shared/coach/coach-program-board/coach-program-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';

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
export class AssignProgramComponent implements OnInit, AfterViewInit {
  private assignService = inject(AssignProgramService);
  private userNameIdService = inject(UserNameIdService);
  private programService = inject(CoachProgramService);

  @ViewChild(CoachProgramBoardComponent) programBoard!: CoachProgramBoardComponent;

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

  ngAfterViewInit() {
    if (this.programBoard) {
      this.updateProgramDropListIds();
    }
  }

  updateProgramDropListIds() {
    if (this.programBoard?.programDropListIds?.length) {
      this.programDropListIds = [...this.programBoard.programDropListIds];
    }
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
        // ✅ minden kötelező mezőt feltöltünk a ProgramDto-ból
        this.programs = programsFromService.map(p => ({
          programId: p.programId ?? p.id ?? 0,
          programName: p.programName ?? p.name ?? '',
          programDescription: p.programDescription ?? p.description ?? '',
          durationDays: p.durationDays ?? 0,
          difficultyLevel: p.difficultyLevel ?? 'unknown',
          workouts: p.workouts ?? [],
        })) as ProgramDto[];

        // debug log
        console.log('📝 Debug: programs =', this.programs);

        // Frissítjük a dropList-eket a template-hez
        this.programDropListIds = this.programs.map(p => `program-${p.programId}`);
        console.log('📝 Debug: programDropListIds =', this.programDropListIds);
      },
      error: (err: any) => {
        console.error('❌ Programok betöltése sikertelen', err);
      },
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

        setTimeout(() => this.updateProgramDropListIds(), 200);
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
