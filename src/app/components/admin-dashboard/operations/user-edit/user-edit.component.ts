import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { UserSelectComponent } from '../../../../components/shared/user/user-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { MessageComponent } from '../../../shared/message/message.component';

import { RoleService } from '../../../../services/roles/role.service';
import { UserNameId } from '../../../../services/user/user-name-id.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import { User } from '../../../../models/user-profil.model';
import { RawUser, Coach, Role } from '../../../../models/user-edit-model';

import { UserEditService } from '../../../../services/admin/user-edit.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    UserSelectComponent,
    CoachSelectComponent,
    MessageComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  styleUrl: './user-edit.component.css',
  templateUrl: './user-edit.component.html',
})
export class UserEditComponent implements OnInit {
  // =============================
  // ADATOK
  // =============================

  users: RawUser[] = [];

  coaches: Coach[] = [];

  roles: Role[] = [];

  // =============================
  // KIVÁLASZTOTT FELHASZNÁLÓ
  // =============================

  selectedUserId?: number;

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

  selectedCoach?: Coach;

  selectedRoles: Role[] = [];

  // =============================
  // ÜZENET
  // =============================

  message = '';

  messageType: 'success' | 'error' | '' = '';

  // =============================
  // CONSTRUCTOR
  // =============================

  constructor(
    private readonly userService: UserEditService,
    private readonly roleService: RoleService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    this.loadCoaches();

    this.loadRoles();

    this.loadUsers();
  }

  // =============================
  // COACHOK BETÖLTÉSE
  // =============================

  private loadCoaches(): void {
    this.userService.getCoaches().subscribe({
      next: (coaches) => {
        this.coaches = coaches;

        this.cdr.detectChanges();
      },

      error: () => {
        this.showError('adminUserEdit.loadCoachesError');
      },
    });
  }

  // =============================
  // ROLE-OK BETÖLTÉSE
  // =============================

  private loadRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;

        this.cdr.detectChanges();
      },

      error: () => {
        this.showError('adminUserEdit.loadRolesError');
      },
    });
  }

  // =============================
  // FELHASZNÁLÓK BETÖLTÉSE
  // =============================

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;

        if (this.users.length > 0) {
          this.selectedUserId = this.users[0].id;

          this.patchUserFromRaw(this.users[0]);
        }

        this.cdr.detectChanges();
      },

      error: () => {
        this.showError('adminUserEdit.loadUsersError');
      },
    });
  }

  // =============================
  // FELHASZNÁLÓ KIVÁLASZTÁSA
  // =============================

  onUserSelected(user: UserNameId): void {
    this.clearMessage();

    this.selectedUserId = user.id;

    const found = this.users.find((currentUser) => currentUser.id === user.id);

    if (found) {
      this.patchUserFromRaw(found);
    }
  }

  // =============================
  // USER ADATOK BETÖLTÉSE
  // =============================

  private patchUserFromRaw(raw: RawUser): void {
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
      roleIds: [],
    };

    this.selectedCoach = this.coaches.find((coach) => coach.id === this.selectedUser.coachId);

    this.selectedRoles = this.roles.filter((role) => raw.roles?.includes(role.name));

    this.selectedUser.roleIds = this.selectedRoles.map((role) => role.id);

    this.selectedUser.roleName = this.selectedRoles.map((role) => role.name).join(',');

    this.cdr.detectChanges();
  }

  // =============================
  // COACH KIVÁLASZTÁSA
  // =============================

  onCoachSelected(coach: Coach): void {
    this.selectedCoach = coach;

    this.selectedUser.coachId = coach.id;
  }

  // =============================
  // ROLE KIVÁLASZTÁSA
  // =============================

  onRoleSelected(roles: Role[]): void {
    this.selectedRoles = roles;

    this.selectedUser.roleIds = roles.map((role) => role.id);

    this.selectedUser.roleName = roles.map((role) => role.name).join(',');
  }

  // =============================
  // MENTÉS
  // =============================

  onSave(): void {
    this.clearMessage();

    try {
      this.setDefaultRoleIfNeeded();

      const rawUser = this.createRawUser();

      this.userService.updateUser(rawUser, this.selectedUser.roleIds || []).subscribe({
        next: () => {
          this.showSuccess('adminUserEdit.updateSuccess');
        },

        error: () => {
          this.showError('adminUserEdit.updateError');
        },
      });
    } catch {
      this.showError('adminUserEdit.saveError');
    }
  }

  // =============================
  // ALAPÉRTELMEZETT ROLE
  // =============================

  private setDefaultRoleIfNeeded(): void {
    if (this.selectedRoles.length > 0) {
      return;
    }

    const defaultRole = this.roles.find((role) => role.name === 'user');

    if (!defaultRole) {
      return;
    }

    this.selectedRoles = [defaultRole];

    this.selectedUser.roleIds = [defaultRole.id];

    this.selectedUser.roleName = defaultRole.name;
  }

  // =============================
  // RAW USER LÉTREHOZÁSA
  // =============================

  private createRawUser(): RawUser {
    return {
      id: this.selectedUser.id,

      usernameOrName: this.selectedUser.username,

      email: this.selectedUser.email,

      avatarUrl: this.selectedUser.avatarUrl,

      roles: this.selectedRoles.map((role) => role.name),

      extraFields: {
        coach_id: this.selectedUser.coachId,

        age: this.selectedUser.age,

        weight: this.selectedUser.weight,

        height: this.selectedUser.height,

        gender: this.selectedUser.gender,

        goals: this.selectedUser.goals,
      },
    };
  }

  // =============================
  // MESSAGE SEGÉDMETÓDUSOK
  // =============================

  private showSuccess(message: string): void {
    this.message = message;

    this.messageType = 'success';
  }

  private showError(message: string): void {
    this.message = message;

    this.messageType = 'error';
  }

  private clearMessage(): void {
    this.message = '';

    this.messageType = '';
  }
}
