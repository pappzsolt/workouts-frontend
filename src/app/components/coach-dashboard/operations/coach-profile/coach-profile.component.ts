import { createInputValidationGuard } from '../../../shared/components/form-controls/app-input.directive';
import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '../../../../services/logger.service';

import { AuthService } from '../../../../services/auth/auth.service';
import { CoachProfileService } from '../../../../services/coach/coach-profile.service';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { UpdateCoachRequest } from '../../../../models/update-coach-request.model';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
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
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

import type { CoachProfile } from '../../../../models/coach-profile.model';

@Component({
  selector: 'app-coach-profile',
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
    AppIconComponent,
    AppCardComponent,
  ],
  templateUrl: './coach-profile.component.html',
  styleUrls: ['./coach-profile.component.css'],
})
export class CoachProfileComponent implements OnInit {
  private readonly validateInputs = createInputValidationGuard();
  private readonly destroyRef = inject(DestroyRef);

  private readonly logger = inject(LoggerService);

  private authService = inject(AuthService);

  private coachProfileService = inject(CoachProfileService);

  // ==========================================================
  // PROFIL
  // ==========================================================

  profile: CoachProfile = {
    name: '',
    email: '',
    password_hash: '',
    phone: '',
    specialization: '',
    avatar_url: '',
    created_at: '',
  };

  // ==========================================================
  // ÜZENET
  // ==========================================================

  saving = false;

  currentPassword = '';

  message = '';

  messageType: 'success' | 'error' | 'info' | '' = '';

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    this.loadProfile();
  }

  // ==========================================================
  // PROFIL BETÖLTÉSE
  // ==========================================================

  private loadProfile(): void {
    this.clearMessage();

    const userId = this.authService.getUserId();

    if (!userId) {
      this.showError(USER_MESSAGES.noUserId);

      return;
    }

    this.coachProfileService.getMemberById(userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.showError(responseMessage([response], USER_MESSAGES.loadProfileError)); return;
        }
        const profile = response.data;
        this.profile = {
          id: profile.id,
          name: profile.usernameOrName ?? '',
          email: profile.email ?? '',
          password_hash: '',
          phone: profile.extraFields?.phone ?? '',
          specialization: profile.extraFields?.specialization ?? '',
          avatar_url: profile.avatarUrl ?? '',
          created_at: profile.createdAt ?? '',
        };

        this.showInfo(responseMessage([response], USER_MESSAGES.profileLoaded));
      },

      error: (error) => {
        this.logger.error('Coach profil betöltési hiba:', error);

        this.showError(errorMessage(error, USER_MESSAGES.loadProfileError));
      },
    });
  }

  // ==========================================================
  // PROFIL MENTÉSE
  // ==========================================================

  saveProfile(): void {
    if (this.saving) return;
    if (!this.validateInputs()) return;
    this.clearMessage();
    if (this.profile.password_hash.trim() && !this.currentPassword.trim()) {
      this.showError('A jelenlegi jelszó megadása kötelező a jelszó módosításához');
      return;
    }

    if (!this.profile.id) {
      this.showError(USER_MESSAGES.saveProfileNoId);

      return;
    }

    const payload: Omit<UpdateCoachRequest, 'roleIds'> = {
      id: this.profile.id,
      type: 'coach',
      name: this.profile.name,
      email: this.profile.email,
      avatarUrl: this.profile.avatar_url,
      phone: this.profile.phone,
      specialization: this.profile.specialization,
      passwordHash: this.profile.password_hash.trim() ? this.profile.password_hash : undefined,
      currentPassword: this.profile.password_hash.trim() ? this.currentPassword : null,
    };

    this.saving = true;
    this.coachProfileService.saveCoachProfile(payload).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.saving = false; }),
    ).subscribe({
      next: response => {
        if (!response.success) {
          this.showError(responseMessage([response], USER_MESSAGES.saveProfileUnknownError)); return;
        }
        if (this.profile.password_hash === payload.passwordHash) {
          this.profile.password_hash = '';
          this.currentPassword = '';
        }

        this.showSuccess(responseMessage([response], USER_MESSAGES.saveProfileSuccess));
      },

      error: (error) => {
        this.logger.error('Coach profil mentési hiba:', error);

        this.showError(errorMessage(error, error.status === 0
          ? USER_MESSAGES.saveProfileNetworkError : USER_MESSAGES.saveProfileUnknownError));
      },
    });
  }

  // ==========================================================
  // MESSAGE SEGÉDMETÓDUSOK
  // ==========================================================

  private showSuccess(message: string): void {
    this.message = message;

    this.messageType = 'success';
  }

  private showError(message: string): void {
    this.message = message;

    this.messageType = 'error';
  }

  private showInfo(message: string): void {
    this.message = message;

    this.messageType = 'info';
  }

  private clearMessage(): void {
    this.message = '';

    this.messageType = '';
  }
}
