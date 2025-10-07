import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AssignProgramService, UserProgramDto } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService, UserNameId } from '../../../../services/user/user-name-id.service';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';

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

  userId!: number;
  selectedProgramId!: number;
  loading = false;
  message = '';
  success = false;

  assignedPrograms: UserProgramDto[] = [];
  users: UserNameId[] = [];

  ngOnInit() {
    this.loadAssignedPrograms();
    this.loadUsers();
  }

  loadAssignedPrograms() {
    this.assignService.getMyAssignedPrograms().subscribe({
      next: (res: any) => {
        if (res.data) this.assignedPrograms = res.data;
      },
      error: () => console.error('❌ Hozzárendelt programok betöltése sikertelen'),
    });
  }

  loadUsers() {
    this.userNameIdService.getAllUsers().subscribe({
      next: (res: UserNameId[]) => this.users = res,
      error: () => console.error('❌ Felhasználók betöltése sikertelen'),
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
        console.error(err);
      },
    });
  }
}
