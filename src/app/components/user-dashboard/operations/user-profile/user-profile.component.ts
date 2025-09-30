import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Role, RoleService } from '../../../../services/roles/role.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { User, RawUser, Coach } from '../../../../models/user-profil.model';
import { UserProfilService } from '../../../../services/user/user-profile/user-profile.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule],
  templateUrl: './user-profile.component.html',
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
    roleIds: [] // ✅ hozzáadva
  };

  coaches: Coach[] = [];
  roles: Role[] = [];
  selectedCoach?: Coach;
  selectedRoles: Role[] = [];
  message: string = '';
  coachName: string = '';

  constructor(
    private userService: UserProfilService,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.message = USER_MESSAGES.noUserId;
      return;
    }

    forkJoin({
      coaches: this.userService.getCoaches(),
      roles: this.roleService.getRoles(),
      profile: this.userService.getMemberById(userId)
    }).subscribe({
      next: ({ coaches, roles, profile }) => {
        this.coaches = coaches;
        this.roles = roles;

        this.selectedUser = {
          id: profile.id,
          username: profile.usernameOrName || '',
          email: profile.email || '',
          password: '',
          avatarUrl: profile.avatarUrl || '',
          age: profile.extraFields?.age,
          weight: profile.extraFields?.weight,
          height: profile.extraFields?.height,
          gender: profile.extraFields?.gender,
          goals: profile.extraFields?.goals,
          coachId: profile.extraFields?.coach_id,
          roleName: undefined,
          roleIds: [] // ✅ hozzáadva
        };

        const coach = this.coaches.find(c => c.id === this.selectedUser.coachId);
        this.coachName = coach ? coach.name : '';
        this.selectedCoach = coach;
        this.cdr.detectChanges();
        this.message = USER_MESSAGES.profileLoaded;
      },
      error: () => {
        this.message = USER_MESSAGES.loadProfileError;
      }
    });
  }

  private patchUserFromRaw(raw: RawUser) {
    this.selectedUser = {
      id: raw.id,
      username: raw.usernameOrName || '',
      email: raw.email || '',
      password: '',
      avatarUrl: raw.avatarUrl || '',
      age: raw.extraFields?.age,
      weight: raw.extraFields?.weight,
      height: raw.extraFields?.height,
      gender: raw.extraFields?.gender,
      goals: raw.extraFields?.goals,
      coachId: raw.extraFields?.coach_id,
      roleName: undefined,
      roleIds: [] // ✅ hozzáadva
    };

    this.selectedCoach = this.coaches.find(c => c.id === this.selectedUser.coachId);
    this.coachName = this.selectedCoach ? this.selectedCoach.name : '';
    this.selectedRoles = this.roles.filter(r => raw.roles?.includes(r.name));

    this.cdr.detectChanges();
  }

  onCoachSelected(coach: Coach) {
    this.selectedCoach = coach;
    this.selectedUser.coachId = coach.id;
    this.coachName = coach.name;
  }

  onRoleSelected(roles: Role[]) {
    this.selectedRoles = roles;
    this.selectedUser.roleIds = roles.map(r => r.id); // ✅ frissítve
  }

  onSave() {
    if (this.selectedUser) {
      const rawUser: RawUser = {
        id: this.selectedUser.id,
        usernameOrName: this.selectedUser.username,
        email: this.selectedUser.email,
        avatarUrl: this.selectedUser.avatarUrl,
        roles: this.selectedRoles.map(r => r.name),
        extraFields: {
          coach_id: this.selectedUser.coachId,
          age: this.selectedUser.age,
          weight: this.selectedUser.weight,
          height: this.selectedUser.height,
          gender: this.selectedUser.gender,
          goals: this.selectedUser.goals
        }
      };

      // ✅ roleIds átadása service-nek
      this.userService.updateUser(rawUser, this.selectedUser.roleIds || []).subscribe({
        next: () => {
          this.message = USER_MESSAGES.updateSuccess;
        },
        error: (err: any) => {
          this.message = USER_MESSAGES.updateError + (err?.message || '');
        }
      });
    }
  }
}
