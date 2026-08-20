import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { CoachEditService } from '../../../../services/admin/coach-edit.service';
import { Coach } from '../../../../models/coach.model';

@Component({
  selector: 'app-coach-edit',
  standalone: true,
  templateUrl: './coach-edit.component.html',
  styleUrls: ['./coach-edit.component.css'],
  imports: [
    CommonModule,
    FormsModule
  ],
  providers: [
    CoachEditService
  ]
})
export class CoachEditComponent implements OnInit {

  selectedCoachId: number | null = null;

  coaches: Coach[] = [];

  selectedCoach: Coach = {
    id: 0,
    name: '',
    email: '',
    phone: '',
    specialization: '',
    avatarUrl: '',
    password: ''
  };

  message = '';
  error = '';
  loading = false;


  // =========================================================
  // Constructor
  // =========================================================

  constructor(
    private readonly coachService: CoachEditService
  ) {}


  // =========================================================
  // Angular lifecycle
  // =========================================================

  ngOnInit(): void {
    this.loadCoaches();
  }


  // =========================================================
  // Edzők betöltése
  // =========================================================

  loadCoaches(): void {

    this.loading = true;
    this.message = '';
    this.error = '';

    this.coachService
      .getCoaches()
      .subscribe({

        next: coaches => {

          this.coaches = coaches;
          this.loading = false;

          if (this.coaches.length > 0) {

            this.selectedCoachId =
              this.coaches[0].id;

            this.onSelectCoach();
          }
        },

        error: err => {

          this.loading = false;

          this.error =
            err?.message ??
            'Az edzők betöltése nem sikerült.';
        }
      });
  }


  // =========================================================
  // Edző kiválasztása
  // =========================================================

  onSelectCoach(): void {

    const found = this.coaches.find(
      coach => coach.id === this.selectedCoachId
    );

    if (found) {

      this.selectedCoach = {
        ...found,
        password: ''
      };

      this.message = '';
      this.error = '';

      return;
    }

    this.resetSelectedCoach();
  }


  // =========================================================
  // Edző mentése
  // =========================================================

  onSave(): void {

    if (this.selectedCoachId === null) {
      this.error = 'Nincs kiválasztva edző.';
      return;
    }

    this.loading = true;
    this.message = '';
    this.error = '';

    this.selectedCoach.id =
      this.selectedCoachId;

    this.coachService
      .updateCoach(
        this.selectedCoachId,
        this.selectedCoach
      )
      .subscribe({

        next: updatedCoach => {

          this.loading = false;

          this.message =
            'Az edző adatai sikeresen frissítve.';

          const index =
            this.coaches.findIndex(
              coach =>
                coach.id === this.selectedCoachId
            );

          if (index !== -1) {

            this.coaches[index] = {
              ...updatedCoach,
              password: ''
            };

            this.selectedCoach = {
              ...updatedCoach,
              password: ''
            };
          }
        },

        error: err => {

          this.loading = false;

          this.error =
            err?.message ??
            'Az edző mentése nem sikerült.';
        }
      });
  }


  // =========================================================
  // Kiválasztott edző alaphelyzetbe állítása
  // =========================================================

  private resetSelectedCoach(): void {

    this.selectedCoach = {
      id: 0,
      name: '',
      email: '',
      phone: '',
      specialization: '',
      avatarUrl: '',
      password: ''
    };
  }
}
