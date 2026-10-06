import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '../../../../services/logger.service';

import { AuthService } from '../../../../services/auth/auth.service';
import { CoachProfileService } from '../../../../services/coach/coach-profile.service';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { UpdateCoachRequest } from '../../../../models/update-coach-request.model';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

import type { CoachProfile } from '../../../../models/coach-profile.model';

@Component({
  selector: 'app-coach-profile',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppCardComponent],
  templateUrl: './coach-profile.component.html',
  styleUrls: ['./coach-profile.component.css'],
})
export class CoachProfileComponent implements OnInit {
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
    this.clearMessage();

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
      passwordHash: this.profile.password_hash,
    };

    this.coachProfileService.saveCoachProfile(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (!response.success) {
          this.showError(responseMessage([response], USER_MESSAGES.saveProfileUnknownError)); return;
        }
        this.profile.password_hash = '';

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
