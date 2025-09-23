// src/app/components/coach-dashboard/operations/coach-profile/coach-profile.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CoachProfile {
  id?: number;
  name: string;
  email: string;
  password_hash: string;
  phone?: string;
  specialization?: string;
  avatar_url?: string;
}

@Component({
  selector: 'app-coach-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-profile.component.html',
  styleUrls: ['./coach-profile.component.css']
})
export class CoachProfileComponent {
  profile: CoachProfile = {
    name: '',
    email: '',
    password_hash: '',
    phone: '',
    specialization: '',
    avatar_url: ''
  };

  saveProfile() {
    console.log('Saving profile', this.profile);
    // Ide jönne a service hívás a backend felé
  }
}
