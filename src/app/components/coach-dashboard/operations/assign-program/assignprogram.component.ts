import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';

import {
  UserNameIdService,
  UserNameId
} from '../../../../services/user/user-name-id.service';

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
  templateUrl: './assignprogram.component.html',
  styleUrls: ['./assignprogram.component.css']
})
export class AssignProgramComponent implements OnInit {

  private assignService = inject(AssignProgramService);
  private userNameIdService = inject(UserNameIdService);
  private route = inject(ActivatedRoute);
  userId!: number;
  selectedProgramId!: number;

  loading = false;
  message = '';
  success = false;

  users: UserNameId[] = [];

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {

      const programId = params['programId'];

      if (programId) {
        this.selectedProgramId = Number(programId);

        console.log(
          'Automatikusan kiválasztott program ID:',
          this.selectedProgramId
        );
      }

    });

    this.loadUsers();
  }
  loadUsers(): void {
    this.userNameIdService.getAllUsers().subscribe({
      next: (users: UserNameId[]) => {
        this.users = users;
      },
      error: () => {
        this.message = 'Felhasználók betöltése sikertelen.';
        this.success = false;
      }
    });
  }

  assignProgram(): void {

    if (!this.userId || !this.selectedProgramId) {
      this.message =
        '❌ Kérlek, válassz felhasználót és programot!';
      this.success = false;
      return;
    }

    this.loading = true;
    this.message = '';
    this.success = false;

    this.assignService
      .assignProgramToUser(
        this.userId,
        this.selectedProgramId
      )
      .subscribe({
        next: response => {
          this.loading = false;
          this.success = response.status === 'success';
          this.message =
            response.message ||
            'Program sikeresen hozzárendelve!';
        },
        error: () => {
          this.loading = false;
          this.success = false;
          this.message =
            'Hiba történt a hozzárendelés során.';
        }
      });
  }
}
