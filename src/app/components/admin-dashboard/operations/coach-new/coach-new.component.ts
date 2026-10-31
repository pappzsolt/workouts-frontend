import { createInputValidationGuard } from '../../../shared/components/form-controls/app-input.directive';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgForm } from '@angular/forms';

import { CoachNewService } from '../../../../services/admin/coach-new.service';
import { CreateCoachRequest } from '../../../../models/create-coach-request.model';

import { AppFormValidationDirective } from '../../../shared/components/form-controls/app-form-validation.directive';
import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppTextareaDirective } from '../../../shared/components/form-controls/app-textarea.directive';
import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { ProfileFieldsComponent } from '../../../shared/components/profile-fields/profile-fields.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';

@Component({
  selector: 'app-coach-new',
  standalone: true,
  imports: [
    AppFormValidationDirective,
    AppInputDirective,
    AppTextareaDirective,
    AppHeadingDirective,
    ProfileFieldsComponent,
    CommonModule,
    FormsModule,
    TranslatePipe,
    MessageComponent,
    AppButtonComponent,
    FormFieldComponent,
  ],
  templateUrl: './coach-new.component.html',
  styleUrls: ['./coach-new.component.css'],
})
export class CoachNewComponent {
  private readonly validateInputs = createInputValidationGuard();
  private readonly destroyRef = inject(DestroyRef);

  coach: CreateCoachRequest = this.createEmptyCoach();

  message = '';

  messageType: 'success' | 'error' | '' = '';

  loading = false;

  constructor(private readonly coachNewService: CoachNewService) {}

  /**
   * Új edző létrehozása.
   */
  onSubmit(form: NgForm): void {
    if (!this.validateInputs()) return;
    if (!form.valid) {
      this.showError('adminCoachNew.validationError');

      return;
    }

    this.loading = true;

    this.clearMessage();

    this.coachNewService.createCoach(this.coach).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

      error: (error: HttpErrorResponse) => {
        this.loading = false;

        this.showError(this.getBackendErrorMessage(error) ?? 'adminCoachNew.createError');
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

  private getBackendErrorMessage(error: HttpErrorResponse): string | undefined {
    const body = error.error;

    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }

    return error.message || undefined;
  }

}
