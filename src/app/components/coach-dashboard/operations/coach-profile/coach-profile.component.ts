import { Component, OnInit, inject } from '@angular/core';

import { AuthService } from '../../../../services/auth/auth.service';
import { CoachProfileService } from '../../../../services/coach/coach-profile.service';
import { USER_MESSAGES } from '../../../../constants/user-messages';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

export interface CoachProfile {
  id?: number;
  name: string;
  email: string;
  password_hash: string;
  phone?: string;
  specialization?: string;
  avatar_url?: string;
  created_at?: string;
}

@Component({
  selector: 'app-coach-profile',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-profile.component.html',
  styleUrls: ['./coach-profile.component.css'],
})
export class CoachProfileComponent implements OnInit {
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

    this.coachProfileService.getMemberById(userId).subscribe({
      next: (profile) => {
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

        this.showSuccess(USER_MESSAGES.profileLoaded);
      },

      error: (error) => {
        console.error('Coach profil betöltési hiba:', error);

        this.showError(USER_MESSAGES.loadProfileError);
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

    const payload = {
      id: this.profile.id,
      type: 'coach',
      name: this.profile.name,
      email: this.profile.email,
      avatarUrl: this.profile.avatar_url,
      phone: this.profile.phone,
      specialization: this.profile.specialization,
      passwordHash: this.profile.password_hash,
    };

    this.coachProfileService.saveCoachProfile(payload).subscribe({
      next: () => {
        this.profile.password_hash = '';

        this.showSuccess(USER_MESSAGES.saveProfileSuccess);
      },

      error: (error) => {
        console.error('Coach profil mentési hiba:', error);

        if (error.status === 0) {
          this.showError(USER_MESSAGES.saveProfileNetworkError);

          return;
        }

        if (error.error?.message) {
          this.showError(`${USER_MESSAGES.serverError}: ${error.error.message}`);

          return;
        }

        this.showError(USER_MESSAGES.saveProfileUnknownError);
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
