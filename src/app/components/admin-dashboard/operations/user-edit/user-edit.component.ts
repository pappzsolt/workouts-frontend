import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserEditService, RawUser, Coach } from '../../../../services/admin/user-edit.service';
import { UserSelectComponent } from '../../../../components/shared/user/user-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { Role, RoleService } from '../../../../services/roles/role.service';
import { UserNameId } from '../../../../services/user/user-name-id.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goals?: string;
  coachId?: number;
  roleName?: string;
  roleIds: number[]; // ✅ kötelező, mindig legyen tömb
}

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
    roleIds: [] // ✅ inicializálva
  };

  coaches: Coach[] = [];
  roles: Role[] = [];
  selectedCoach?: Coach;
  selectedRoles: Role[] = [];

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

  onUserSelected(user: UserNameId) {
    this.selectedUserId = user.id;
    const found = this.users.find(u => u.id === user.id);
    if (found) this.patchUserFromRaw(found);
  }

  private patchUserFromRaw(raw: RawUser) {
    // ✅ Hibás deklaráció javítva: this.selectedUser-t használjuk
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
      roleIds: [] // ✅ inicializálva
    };

    this.selectedCoach = this.coaches.find(c => c.id === this.selectedUser.coachId);

    this.selectedRoles = this.roles.filter(r => raw.roles?.includes(r.name));
    this.selectedUser.roleIds = this.selectedRoles.map(r => r.id);
    this.selectedUser.roleName = this.selectedRoles.map(r => r.name).join(',');

    this.cdr.detectChanges();
  }

  onCoachSelected(coach: Coach) {
    this.selectedCoach = coach;
    this.selectedUser.coachId = coach.id;
  }

  onRoleSelected(roles: Role[]) {
    this.selectedRoles = roles;
    this.selectedUser.roleIds = roles.map(r => r.id);
    this.selectedUser.roleName = roles.map(r => r.name).join(',');
  }

  onSave() {
    if (!this.selectedRoles || this.selectedRoles.length === 0) {
      const defaultRole = this.roles.find(r => r.name === 'user');
      if (defaultRole) {
        this.selectedRoles = [defaultRole];
        this.selectedUser.roleIds = [defaultRole.id];
        this.selectedUser.roleName = defaultRole.name;
      }
    }

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

      // ✅ roleIds mindig tömb, nincs TS2345 hiba
      this.userService.updateUser(rawUser, this.selectedUser.roleIds || []).subscribe({
        next: () => alert('Felhasználó sikeresen frissítve!'),
        error: (err) => alert('Hiba a frissítés során: ' + err.message)
      });
    }
  }
}
