import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AssignProgramService, ProgramDto, UserProgramDto } from '../../../../services/coach/assign-program/assignprogram.service';

@Component({
  selector: 'app-assignprogram',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './assignprogram.component.html'
})
export class AssignProgramComponent implements OnInit {
  private assignService = inject(AssignProgramService);

  userId!: number;
  selectedProgramId!: number;
  loading = false;
  message = '';
  success = false;

  programs: ProgramDto[] = [];
  assignedPrograms: UserProgramDto[] = [];

  ngOnInit() {
    this.loadPrograms();
    this.loadAssignedPrograms();
  }

  loadPrograms() {
    this.assignService.getAllPrograms().subscribe({
      next: res => {
        if (res.data) {
          this.programs = res.data;
        }
      },
      error: () => console.error('❌ Programok betöltése sikertelen'),
    });
  }

  loadAssignedPrograms() {
    this.assignService.getMyAssignedPrograms().subscribe({
      next: res => {
        if (res.data) {
          this.assignedPrograms = res.data;
        }
      },
      error: () => console.error('❌ Hozzárendelt programok betöltése sikertelen'),
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
      next: res => {
        this.loading = false;
        this.success = res.status === 'success';
        this.message = res.message || '✅ Program sikeresen hozzárendelve!';
        this.loadAssignedPrograms();
      },
      error: err => {
        this.loading = false;
        this.success = false;
        this.message = '❌ Hiba történt a hozzárendelés során.';
        console.error(err);
      },
    });
  }
}
