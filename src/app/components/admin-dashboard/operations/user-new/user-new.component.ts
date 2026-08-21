import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { UserNewService } from '../../../../services/admin/user-new.service';

import { RoleSelectComponent } from '../../../shared/roles/role-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';

import { Role } from '../../../../models/role.model';
import { CoachNameId } from '../../../../services/coach/coach-name-id.service';

import {
  CreateUserRequest,
  CreateUserResponse
} from '../../../../models/user-new-model';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RoleSelectComponent,
    CoachSelectComponent
  ],
  templateUrl: './user-new.component.html',
  styleUrls: ['./user-new.component.css']
})
export class UserNewComponent {

  user: {
    username: string;
    email: string;
    passwordHash: string;
    avatarUrl: string;
    age: number | null;
    weight: number | null;
    height: number | null;
    gender: string;
    goals: string;
    coachId?: number;
    coachName: string;
    roleIds: Role[];
  } = {
    username: '',
    email: '',
    passwordHash: '',
    avatarUrl: '',
    age: null,
    weight: null,
    height: null,
    gender: '',
    goals: '',
    coachName: '',
    roleIds: []
  };

  roles: Role[] = [];

  message = '';
  isError = false;

  constructor(
    private userNewService: UserNewService
  ) {}

  onRoleSelected(role: Role): void {
    if (!this.user.roleIds.some(r => r.id === role.id)) {
      this.user.roleIds.push(role);
    }
  }

  onRemoveRole(role: Role): void {
    this.user.roleIds = this.user.roleIds.filter(
      r => r.id !== role.id
    );
  }

  onCoachSelected(coach: CoachNameId): void {
    this.user.coachId = coach.id;
    this.user.coachName = coach.name;
  }

  onSubmit(form: NgForm): void {

    if (!form.valid || this.user.roleIds.length === 0) {
      this.message =
        'Kérlek töltsd ki az összes kötelező mezőt és válassz legalább egy szerepkört!';
      this.isError = true;
      return;
    }

    const payload: CreateUserRequest = {
      type: 'user',
      username: this.user.username,
      email: this.user.email,
      passwordHash: this.user.passwordHash,
      avatarUrl: this.user.avatarUrl,
      age: this.user.age ?? undefined,
      weight: this.user.weight ?? undefined,
      height: this.user.height ?? undefined,
      gender: this.user.gender,
      goals: this.user.goals,
      coachId: this.user.coachId,
      roleIds: this.user.roleIds.map(role => role.id)
    };

    this.userNewService.createUser(payload).subscribe({

      next: (res: CreateUserResponse) => {

        this.message = res.message || 'Sikeres létrehozás';
        this.isError = !res.success;

        if (res.success) {
          form.resetForm();

          this.user.roleIds = [];
          this.user.coachId = undefined;
          this.user.coachName = '';
        }
      },

      error: (err) => {
        this.message =
          err.error?.message || 'Hiba a mentésnél';

        this.isError = true;
      }

    });
  }
}
