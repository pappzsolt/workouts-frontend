import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService, UserNameId } from '../../../../services/user/user-name-id.service';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';
import { CoachProgram } from '../../../../models/coach-program.model';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';

@Component({
  selector: 'app-assignprogram',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    CoachProgramSelectComponent
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
  users: UserNameId[] = [];
  programs: CoachProgram[] = [];

  ngOnInit() {
    this.loadUsers();
    this.loadPrograms();
  }

  loadUsers() {
    this.userNameIdService.getAllUsers().subscribe({
      next: (res: UserNameId[]) => this.users = res,
      error: (err) => console.error('❌ Felhasználók betöltése sikertelen', err)
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
          workouts: p.workouts ?? []
        }));
      },
      error: (err) => console.error('❌ Programok betöltése sikertelen', err)
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
      },
      error: (err: any) => {
        this.loading = false;
        this.success = false;
        this.message = '❌ Hiba történt a hozzárendelés során.';
        console.error('❌ assignProgram API error:', err);
      }
    });
  }

  onProgramSelected(id: number) {
    console.log('Program selected:', id);
    this.selectedProgramId = id;
  }
}
