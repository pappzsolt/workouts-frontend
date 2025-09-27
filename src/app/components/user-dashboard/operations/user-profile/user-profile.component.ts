import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserProfileService } from '../../../../services/user/user-profile/user-profile.service';
import { USER_MESSAGES } from '../../../../constants/user-messages';

export interface UserProfile {
  id?: number;
  usernameOrName: string;
  email: string;
  password_hash?: string;
  avatar_url?: string | null;
  roles?: string[];
  extraFields: {
    coach_id?: number;
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    goals?: string;
    created_at?: string;
  };
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  profile: UserProfile = {
    usernameOrName: '',
    email: '',
    password_hash: '',
    avatar_url: null,
    roles: [],
    extraFields: {
      coach_id: undefined,
      age: undefined,
      weight: undefined,
      height: undefined,
      gender: '',
      goals: '',
      created_at: ''
    }
  };

  message: string = '';

  constructor(private userProfileService: UserProfileService) {}

  ngOnInit(): void {
    this.userProfileService.getLoggedInMemberProfile().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          const data = res.data;

          // Biztonságos extraFields inicializálás
          const extraFields = {
            coach_id: data.extraFields?.coach_id ?? null,
            age: data.extraFields?.age ?? null,
            weight: data.extraFields?.weight ?? null,
            height: data.extraFields?.height ?? null,
            gender: data.extraFields?.gender ?? '',
            goals: data.extraFields?.goals ?? '',
            created_at: data.extraFields?.created_at ?? ''
          };

          this.profile = {
            id: data.id,
            usernameOrName: data.usernameOrName ?? '',
            email: data.email ?? '',
            avatar_url: data.avatarUrl ?? '',
            roles: data.roles ?? [],
            extraFields,
            password_hash: '' // mindig üres
          };

          this.message = '';
        } else {
          this.message = USER_MESSAGES.notFound;
        }
      },
      error: (err: any) => {
        console.error('Profil betöltési hiba', err);
        this.message = USER_MESSAGES.loadProfileError || 'Hiba történt a profil betöltésekor.';
      }
    });
  }

  saveProfile() {
    if (!this.profile.id) {
      this.message = USER_MESSAGES.saveProfileNoId;
      return;
    }

    const payload = {
      id: this.profile.id,
      type: 'user',
      name: this.profile.usernameOrName,
      email: this.profile.email,
      avatarUrl: this.profile.avatar_url,
      extraFields: this.profile.extraFields,
      passwordHash: this.profile.password_hash
    };

    this.userProfileService.saveUserProfile(payload).subscribe({
      next: () => {
        this.message = USER_MESSAGES.saveProfileSuccess;
        this.profile.password_hash = '';
      },
      error: (err: any) => {
        console.error('Profil mentési hiba', err);
        if (err.status === 0) {
          this.message = USER_MESSAGES.saveProfileNetworkError;
        } else if (err.error && err.error.message) {
          this.message = `${USER_MESSAGES.serverError}: ${err.error.message}`;
        } else {
          this.message = USER_MESSAGES.saveProfileUnknownError;
        }
      }
    });
  }
}
