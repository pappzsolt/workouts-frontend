import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UserSelectComponent } from '../../../../components/shared/user/user-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';

import { RoleService } from '../../../../services/roles/role.service';
import { UserNameId } from '../../../../services/user/user-name-id.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import { User } from '../../../../models/user-profil.model';

import {
  RawUser,
  Coach,
  Role
} from '../../../../models/user-edit-model';

import { UserEditService } from '../../../../services/admin/user-edit.service';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UserSelectComponent,
    CoachSelectComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  templateUrl: './user-edit.component.html',
})
export class UserEditComponent implements OnInit {

  users: RawUser[] = [];

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
    roleIds: []
  };

  coaches: Coach[] = [];
  roles: Role[] = [];

  selectedCoach?: Coach;
  selectedRoles: Role[] = [];

  message = '';

  constructor(
    private userService: UserEditService,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.userService.getCoaches().subscribe(coaches => {
      this.coaches = coaches;
      this.cdr.detectChanges();
    });

    this.roleService.getRoles().subscribe(roles => {
      this.roles = roles;
      this.cdr.detectChanges();
    });

    this.userService.getUsers().subscribe(users => {
      this.users = users;

      if (this.users.length > 0) {
        this.selectedUserId = this.users[0].id;
        this.patchUserFromRaw(this.users[0]);
      }
    });
  }

  onUserSelected(user: UserNameId): void {

    this.selectedUserId = user.id;

    const found = this.users.find(u => u.id === user.id);

    if (found) {
      this.patchUserFromRaw(found);
    }
  }

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
      roleIds: []
    };

    this.selectedCoach = this.coaches.find(
      coach => coach.id === this.selectedUser.coachId
    );

    this.selectedRoles = this.roles.filter(
      role => raw.roles?.includes(role.name)
    );

    this.selectedUser.roleIds = this.selectedRoles.map(
      role => role.id
    );

    this.selectedUser.roleName = this.selectedRoles
      .map(role => role.name)
      .join(',');

    this.cdr.detectChanges();
  }

  onCoachSelected(coach: Coach): void {

    this.selectedCoach = coach;
    this.selectedUser.coachId = coach.id;
  }

  onRoleSelected(roles: Role[]): void {

    this.selectedRoles = roles;

    this.selectedUser.roleIds = roles.map(
      role => role.id
    );

    this.selectedUser.roleName = roles
      .map(role => role.name)
      .join(',');
  }

  onSave(): void {

    try {

      if (!this.selectedRoles || this.selectedRoles.length === 0) {

        const defaultRole = this.roles.find(
          role => role.name === 'user'
        );

        if (defaultRole) {

          this.selectedRoles = [defaultRole];

          this.selectedUser.roleIds = [defaultRole.id];

          this.selectedUser.roleName = defaultRole.name;
        }
      }

      const rawUser: RawUser = {
        id: this.selectedUser.id,
        usernameOrName: this.selectedUser.username,
        email: this.selectedUser.email,
        avatarUrl: this.selectedUser.avatarUrl,
        roles: this.selectedRoles.map(role => role.name),

        extraFields: {
          coach_id: this.selectedUser.coachId,
          age: this.selectedUser.age,
          weight: this.selectedUser.weight,
          height: this.selectedUser.height,
          gender: this.selectedUser.gender,
          goals: this.selectedUser.goals
        }
      };

      this.userService
        .updateUser(
          rawUser,
          this.selectedUser.roleIds || []
        )
        .subscribe({

          next: () => {
            this.message = 'Felhasználó sikeresen frissítve!';
          },

          error: (err) => {
            this.message =
              'Hiba a frissítés során: ' +
              (err?.message || 'Ismeretlen hiba');
          }

        });

    } catch (err: any) {

      this.message =
        'Hiba a mentés során: ' +
        (err?.message || 'Ismeretlen hiba');
    }
  }
}
