import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth/auth.service';
import { AdminDashboardService } from '../../../../services/admin/admin-dashboard.service';
import {USER_MESSAGES } from '../../../../constants/user-messages'
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
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-profile.component.html',
  styleUrls: ['./coach-profile.component.css']
})
export class CoachProfileComponent implements OnInit {
  profile: CoachProfile = {
    name: '',
    email: '',
    password_hash: '',
    phone: '',
    specialization: '',
    avatar_url: '',
    created_at: ''
  };

  message: string = '';

  constructor(
    private authService: AuthService,
    private adminDashboardService: AdminDashboardService
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    console.log('[CoachProfileComponent] User ID:', userId);
    if (userId) {
      this.adminDashboardService.getMemberById(userId).subscribe({
        next: (profile: any) => {
          this.profile = {
            id: profile.id,
            name: profile.usernameOrName,
            email: profile.email,
            password_hash: '',
            phone: profile.extraFields?.phone,
            specialization: profile.extraFields?.specialization,
            avatar_url: profile.avatarUrl,
            created_at: profile.createdAt
          };
          console.log('Profile loaded:', this.profile);
        },
        error: (err: any) => {
          console.error('Profil betöltési hiba', err);
          this.message = USER_MESSAGES.loadProfileError;
        }
      });
    } else {
      console.warn('Nincs bejelentkezett user ID');
      this.message = USER_MESSAGES.noUserId;
    }
  }

  saveProfile() {
    if (!this.profile.id) {
      this.message = USER_MESSAGES.saveProfileNoId;
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
      passwordHash: this.profile.password_hash
    };

    this.adminDashboardService.saveCoachProfile(payload).subscribe({
      next: (res: any) => {
        console.log('Profile saved successfully', res);
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
