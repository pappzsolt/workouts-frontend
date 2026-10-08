import { createInputValidationGuard } from '../../../shared/components/form-controls/app-input.directive';
import type { CoachNameId } from '../../../../models/common/coach-name-id.model';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgForm } from '@angular/forms';

import { UserNewService } from '../../../../services/admin/user-new.service';

import { RoleSelectComponent } from '../../../shared/roles/role-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { MessageComponent } from '../../../shared/components/message/message.component';

import { Role } from '../../../../models/role.model';

import { CreateUserRequest } from '../../../../models/user-new-model';
import type { ApiResponse } from '../../../../models/backend-dto/common/api-response';

import { AppSelectComponent } from '../../../shared/components/app-select/app-select.component';
import type { SelectOption } from '../../../../models/common/select-option.model';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent, RoleSelectComponent, CoachSelectComponent, MessageComponent],
  templateUrl: './user-new.component.html',
  styleUrls: ['./user-new.component.css'],
})
export class UserNewComponent {
  private readonly validateInputs = createInputValidationGuard();
  private readonly destroyRef = inject(DestroyRef);

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
    roleIds: [],
  };

  readonly genderOptions: SelectOption[] = [
    { value: 'male', label: 'common.male' },
    { value: 'female', label: 'common.female' },
  ];

  roles: Role[] = [];

  // =============================
  // ÜZENET
  // =============================

  message = '';

  messageType: 'success' | 'error' | '' = '';

  constructor(private readonly userNewService: UserNewService) {}

  // =============================
  // ROLE KIVÁLASZTÁSA
  // =============================

  onRoleSelected(role: Role): void {
    if (!this.user.roleIds.some((r) => r.id === role.id)) {
      this.user.roleIds.push(role);
    }
  }

  // =============================
  // ROLE ELTÁVOLÍTÁSA
  // =============================

  onRemoveRole(role: Role): void {
    this.user.roleIds = this.user.roleIds.filter((r) => r.id !== role.id);
  }

  // =============================
  // COACH KIVÁLASZTÁSA
  // =============================

  onCoachSelected(coach: CoachNameId): void {
    this.user.coachId = coach.id;

    this.user.coachName = coach.name;
  }

  // =============================
  // FELHASZNÁLÓ LÉTREHOZÁSA
  // =============================

  onSubmit(form: NgForm): void {
    if (!this.validateInputs()) return;
    this.clearMessage();

    if (!form.valid || this.user.roleIds.length === 0) {
      this.showError('adminUserNew.validationError');

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

      roleIds: this.user.roleIds.map((role) => role.id),
    };

    this.userNewService.createUser(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<void>) => {
        if (res.success) {
          this.showSuccess(res.message || 'adminUserNew.createSuccess');

          form.resetForm();
          this.user.gender = '';

          this.user.roleIds = [];

          this.user.coachId = undefined;

          this.user.coachName = '';
        } else {
          this.showError(res.message || 'adminUserNew.saveError');
        }
      },

      error: (err) => {
        this.showError(err.error?.message || 'adminUserNew.saveError');
      },
    });
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

  trackByRole(index: number, role: Role): number {
    return role.id;
  }

}
