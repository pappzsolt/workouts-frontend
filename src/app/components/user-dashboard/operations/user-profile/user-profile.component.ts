import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { AuthService } from '../../../../services/auth/auth.service';

import { User, RawUser, Coach } from '../../../../models/user-profil.model';

import { UserProfilService } from '../../../../services/user/user-profile/user-profile.service';

import { forkJoin } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [...SHARED_IMPORTS, MatFormFieldModule, MatSelectModule, MatInputModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css',
})
export class UserProfileComponent implements OnInit {
  users: RawUser[] = [];

  selectedUser: User = {
    id: 0,
    username: '',
    email: '',
    password: '',
    avatarUrl: '',
    age: undefined,
    weight: undefined,
    height: undefined,
    gender: '',
    goals: '',
    coachId: undefined,
    roleName: undefined,
    roleIds: [],
  };

  coaches: Coach[] = [];

  /**
   * A felhasználó meglévő role-jai.
   * A profil oldalon nem módosítjuk őket,
   * csak mentéskor visszaküldjük a backendnek.
   */
  roles: string[] = [];

  selectedCoach?: Coach;

  message = '';

  coachName = '';

  constructor(
    private userService: UserProfilService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getUserId();

    if (!userId) {
      this.message = 'userProfile.noUserId';

      return;
    }

    forkJoin({
      coaches: this.userService.getCoaches(),
      profile: this.userService.getMemberById(userId),
    }).subscribe({
      next: ({ coaches, profile }) => {
        this.coaches = coaches;

        /**
         * Megőrizzük a backendről érkező role-okat.
         */
        this.roles = profile.roles || [];

        this.selectedUser = {
          id: profile.id,
          username: profile.usernameOrName || '',
          email: profile.email || '',
          password: '',
          avatarUrl: profile.avatarUrl || '',
          age: profile.extraFields?.age,
          weight: profile.extraFields?.weight,
          height: profile.extraFields?.height,
          gender: profile.extraFields?.gender || '',
          goals: profile.extraFields?.goals || '',
          coachId: profile.extraFields?.coach_id,
          roleName: undefined,
          roleIds: [],
        };

        const coach = this.coaches.find((c) => c.id === this.selectedUser.coachId);

        this.coachName = coach ? coach.name : '';

        this.selectedCoach = coach;

        this.cdr.detectChanges();

        this.message = 'userProfile.profileLoaded';
      },

      error: (err) => {
        console.error('Hiba a profil betöltésekor:', err);

        this.message = 'userProfile.loadError';
      },
    });
  }

  private patchUserFromRaw(raw: RawUser): void {
    this.roles = raw.roles || [];

    this.selectedUser = {
      id: raw.id,
      username: raw.usernameOrName || '',
      email: raw.email || '',
      password: '',
      avatarUrl: raw.avatarUrl || '',
      age: raw.extraFields?.age,
      weight: raw.extraFields?.weight,
      height: raw.extraFields?.height,
      gender: raw.extraFields?.gender || '',
      goals: raw.extraFields?.goals || '',
      coachId: raw.extraFields?.coach_id,
      roleName: undefined,
      roleIds: [],
    };

    this.selectedCoach = this.coaches.find((c) => c.id === this.selectedUser.coachId);

    this.coachName = this.selectedCoach ? this.selectedCoach.name : '';

    this.cdr.detectChanges();
  }

  onCoachSelected(coach: Coach): void {
    this.selectedCoach = coach;

    this.selectedUser.coachId = coach.id;

    this.coachName = coach.name;
  }

  onSave(): void {
    if (!this.selectedUser) {
      return;
    }

    const rawUser: RawUser = {
      id: this.selectedUser.id,

      usernameOrName: this.selectedUser.username,

      email: this.selectedUser.email,

      avatarUrl: this.selectedUser.avatarUrl,

      /**
       * A meglévő role-ok változatlanul
       * visszakerülnek a backendnek.
       */
      roles: this.roles,

      extraFields: {
        coach_id: this.selectedUser.coachId,

        age: this.selectedUser.age,

        weight: this.selectedUser.weight,

        height: this.selectedUser.height,

        gender: this.selectedUser.gender,

        goals: this.selectedUser.goals,
      },
    };

    this.userService.updateUser(rawUser).subscribe({
      next: () => {
        this.message = 'userProfile.updateSuccess';
      },

      error: (err: any) => {
        console.error('Profil mentési hiba:', err);

        this.message = 'userProfile.updateError' + (err?.message || '');
      },
    });
  }
}
