import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { CoachNewService } from '../../../../services/admin/coach-new.service';

import {
  CreateCoachRequest
} from '../../../../models/create-coach-request.model';

@Component({
  selector: 'app-coach-new',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './coach-new.component.html',
  styleUrls: ['./coach-new.component.css']
})
export class CoachNewComponent {

  coach: CreateCoachRequest = this.createEmptyCoach();

  message = '';
  isError = false;
  loading = false;

  constructor(
    private readonly coachNewService: CoachNewService
  ) {}

  /**
   * Új edző létrehozása.
   */
  onSubmit(form: NgForm): void {

    if (!form.valid) {

      this.showError(
        'Kérlek töltsd ki az összes kötelező mezőt és adj meg érvényes adatokat.'
      );

      return;
    }

    this.loading = true;
    this.clearMessage();

    this.coachNewService
      .createCoach(this.coach)
      .subscribe({

        next: response => {

          this.loading = false;

          if (response.success) {

            this.showSuccess(
              response.message ||
              'Az edző sikeresen létrejött.'
            );

            form.resetForm();

            this.coach = this.createEmptyCoach();

          } else {

            this.showError(
              response.message ||
              'Az edző létrehozása nem sikerült.'
            );
          }
        },

        error: (error: Error) => {

          this.loading = false;

          this.showError(
            error.message ||
            'Az edző létrehozása nem sikerült.'
          );
        }
      });
  }

  /**
   * Üres coach modell létrehozása.
   */
  private createEmptyCoach(): CreateCoachRequest {

    return {
      type: 'coach',
      name: '',
      email: '',
      passwordHash: '',
      phone: '',
      specialization: '',
      avatarUrl: '',
      roleIds: [3]
    };
  }

  /**
   * Sikeres üzenet megjelenítése.
   */
  private showSuccess(message: string): void {

    this.message = message;
    this.isError = false;
  }

  /**
   * Hibaüzenet megjelenítése.
   */
  private showError(message: string): void {

    this.message = message;
    this.isError = true;
  }

  /**
   * Üzenet törlése.
   */
  private clearMessage(): void {

    this.message = '';
    this.isError = false;
  }
}
