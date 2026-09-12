import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';

import { CoachNewService } from '../../../../services/admin/coach-new.service';
import { CreateCoachRequest } from '../../../../models/create-coach-request.model';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-coach-new',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-new.component.html',
  styleUrls: ['./coach-new.component.css'],
})
export class CoachNewComponent {
  coach: CreateCoachRequest = this.createEmptyCoach();

  message = '';

  messageType: 'success' | 'error' | '' = '';

  loading = false;

  constructor(private readonly coachNewService: CoachNewService) {}

  /**
   * Új edző létrehozása.
   */
  onSubmit(form: NgForm): void {
    if (!form.valid) {
      this.showError('adminCoachNew.validationError');

      return;
    }

    this.loading = true;

    this.clearMessage();

    this.coachNewService.createCoach(this.coach).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success) {
          this.showSuccess(response.message || 'adminCoachNew.createSuccess');

          form.resetForm();

          this.coach = this.createEmptyCoach();
        } else {
          this.showError(response.message || 'adminCoachNew.createError');
        }
      },

      error: (error: Error) => {
        this.loading = false;

        this.showError(error.message || 'adminCoachNew.createError');
      },
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

      roleIds: [3],
    };
  }

  /**
   * Sikeres üzenet megjelenítése.
   */
  private showSuccess(message: string): void {
    this.message = message;

    this.messageType = 'success';
  }

  /**
   * Hibaüzenet megjelenítése.
   */
  private showError(message: string): void {
    this.message = message;

    this.messageType = 'error';
  }

  /**
   * Üzenet törlése.
   */
  private clearMessage(): void {
    this.message = '';

    this.messageType = '';
  }
}
