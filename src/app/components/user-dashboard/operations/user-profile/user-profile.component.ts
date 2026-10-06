import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';

import { Subject, finalize, forkJoin, take, takeUntil } from 'rxjs';

import { AuthService } from '../../../../services/auth/auth.service';

import { UserProfile, RawUser } from '../../../../models/user-profil.model';
import type { CoachNameId } from '../../../../models/common/coach-name-id.model';

import { UserProfilService } from '../../../../services/user/user-profile/user-profile.service';

import { LanguageService } from '../../../../services/shared/language.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [...SHARED_IMPORTS, MatFormFieldModule, MatSelectModule, MatInputModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css',
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  users: RawUser[] = [];

  selectedUser: UserProfile = {
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

  coaches: CoachNameId[] = [];

  /**
   * A felhasználó meglévő role-jai.
   * A profil oldalon nem módosítjuk őket,
   * csak mentéskor visszaküldjük a backendnek.
   */
  roles: string[] = [];

  selectedCoach?: CoachNameId;

  message = '';

  messageType: 'success' | 'error' | 'info' | '' = '';

  coachName = '';
  saving = false;

  constructor(
    private userService: UserProfilService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    // Profile data is independent of UI language; translated labels update
    // themselves. Load once so language changes preserve unsaved edits.
    this.languageService.language$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
      this.loadProfile();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // PROFIL BETÖLTÉSE
  // ============================================================

  private loadProfile(): void {
    const userId = this.authService.getUserId();

    if (!userId) {
      this.message = 'userProfile.noUserId';
      this.messageType = 'error';

      return;
    }

    forkJoin({
      coaches: this.userService.getCoaches(),
      profile: this.userService.getMemberById(userId),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
          this.messageType = 'success';
        },

        error: () => {
          this.message = 'userProfile.loadError';
          this.messageType = 'error';
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

  onCoachSelected(coach: CoachNameId): void {
    this.selectedCoach = coach;

    this.selectedUser.coachId = coach.id;

    this.coachName = coach.name;
  }

  onSave(): void {
    if (this.saving || !this.selectedUser.id) {
      return;
    }

    const rawUser: RawUser = {
      id: this.selectedUser.id,

      usernameOrName: this.selectedUser.username,

      email: this.selectedUser.email,

      password: this.selectedUser.password?.trim()
        ? this.selectedUser.password
        : undefined,

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

    this.saving = true;
    this.userService
      .updateUser(rawUser)
      .pipe(takeUntil(this.destroy$), finalize(() => { this.saving = false; }))
      .subscribe({
        next: (response) => {
          this.message = responseMessage([response], response.success ? 'userProfile.updateSuccess' : 'userProfile.updateError');
          this.messageType = response.success ? 'success' : 'error';
          if (response.success && this.selectedUser.password === rawUser.password) this.selectedUser.password = '';
        },

        error: (error) => {
          this.message = errorMessage(error, 'userProfile.updateError');
          this.messageType = 'error';
        },
      });
  }
}
