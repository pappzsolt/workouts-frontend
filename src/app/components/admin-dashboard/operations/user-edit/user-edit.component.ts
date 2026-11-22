import { createInputValidationGuard } from '../../../shared/components/form-controls/app-input.directive';
import { EMPTY, Subject, finalize, forkJoin, map, switchMap, takeUntil } from 'rxjs';
import type { UserNameId } from '../../../../models/common/user-name-id.model';
import { Component, OnInit, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserSelectComponent } from '../../../../components/shared/user/user-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { AppSelectComponent } from '../../../shared/components/app-select/app-select.component';

import { RoleService } from '../../../../services/roles/role.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import { UserProfile, RawUser } from '../../../../models/user-profil.model';
import type { CoachNameId } from '../../../../models/common/coach-name-id.model';
import { Role } from '../../../../models/role.model';

import { UserEditService } from '../../../../services/admin/user-edit.service';

import { AppFormValidationDirective } from '../../../shared/components/form-controls/app-form-validation.directive';
import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppTextareaDirective } from '../../../shared/components/form-controls/app-textarea.directive';
import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { ProfileFieldsComponent } from '../../../shared/components/profile-fields/profile-fields.component';

import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import type { SelectOption } from '../../../../models/common/select-option.model';
import {
  GENDER_NOT_SPECIFIED_LABEL,
  GENDER_OPTIONS,
  normalizeGender,
} from '../../../../constants/gender';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [
    AppFormValidationDirective,
    AppInputDirective,
    AppTextareaDirective,
    AppHeadingDirective,
    ProfileFieldsComponent,
    FormsModule,
    TranslatePipe,
    AppButtonComponent,
    FormFieldComponent,
    UserSelectComponent,
    CoachSelectComponent,
    MessageComponent,
    AppSelectComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './user-edit.component.html',
})
export class UserEditComponent implements OnInit {
  private readonly validateInputs = createInputValidationGuard();
  private readonly destroyRef = inject(DestroyRef);

  readonly genderOptions: SelectOption[] = GENDER_OPTIONS;
  readonly genderNotSpecifiedLabel = GENDER_NOT_SPECIFIED_LABEL;

  // =============================
  // ADATOK
  // =============================

  users: RawUser[] = [];

  coaches: CoachNameId[] = [];

  roles: Role[] = [];

  // =============================
  // KIVÁLASZTOTT FELHASZNÁLÓ
  // =============================

  selectedUserId?: number;

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

  selectedCoach?: CoachNameId;

  selectedRole?: Role;
  private baseline?: RawUser;
  private readonly selectionChanged = new Subject<void>();

  get hasSelectedSnapshot(): boolean {
    return !!this.baseline && this.selectedUserId === this.baseline.id && this.selectedUser.id === this.baseline.id;
  }

  // =============================
  // ÜZENET
  // =============================

  loading = true;
  ready = false;
  saving = false;

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
    forkJoin({
      coaches: this.userService.getCoaches(),
      roles: this.roleService.getRoles(),
      users: this.userService.getUsers(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ coaches, roles, users }) => {
          this.coaches = coaches;
          this.roles = roles;
          this.users = users;
          if (!roles.length) {
            this.showError('adminUserEdit.loadRolesError');
            return;
          }
          const user = users.find((current) => current.id === this.selectedUserId) ?? users[0];
          if (user) {
            this.selectedUserId = user.id;
            this.patchUserFromRaw(user);
          }
          this.ready = true;
        },
        error: () => this.showError('adminUserEdit.loadUsersError'),
      });
  }

  // =============================
  // FELHASZNÁLÓ KIVÁLASZTÁSA
  // =============================

  onUserSelected(user: UserNameId): void {
    if (this.saving) return;
    this.selectionChanged.next();
    this.clearMessage();

    this.selectedUserId = user.id;

    const found = this.users.find((currentUser) => currentUser.id === user.id);

    if (found) {
      this.patchUserFromRaw(found);
    } else {
      this.baseline = undefined;
      this.userService.getUser(user.id)
        .pipe(takeUntil(this.selectionChanged), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: snapshot => {
            if (this.selectedUserId !== snapshot.id) return;
            this.users.push(snapshot);
            this.patchUserFromRaw(snapshot);
          },
          error: () => this.showError('adminUserEdit.loadUsersError'),
        });
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
      gender: normalizeGender(raw.extraFields?.gender),
      goals: raw.extraFields?.goals,
      coachId: raw.extraFields?.coach_id,
      roleName: undefined,
      roleIds: [],
    };

    this.selectedCoach = this.coaches.find((coach) => coach.id === this.selectedUser.coachId);

    this.selectedRole = this.roles.find((role) => raw.roles?.includes(role.name));
    this.selectedUser.roleIds = this.selectedRole ? [this.selectedRole.id] : [];
    this.selectedUser.roleName = this.selectedRole?.name;
    this.baseline = this.createRawUser();
    this.baseline.roles = [...raw.roles];

    this.cdr.detectChanges();
  }

  // =============================
  // COACH KIVÁLASZTÁSA
  // =============================

  onCoachSelected(coach: CoachNameId | null): void {
    this.selectedCoach = coach ?? undefined;
    this.selectedUser.coachId = coach?.id ?? null;
  }

  // =============================
  // ROLE KIVÁLASZTÁSA
  // =============================

  onRoleSelected(role: Role): void {
    this.selectedRole = role;
    this.selectedUser.roleIds = [role.id];
    this.selectedUser.roleName = role.name;
  }

  // =============================
  // MENTÉS
  // =============================

  onSave(): void {
    const baseline = this.baseline;
    if (!baseline || !this.ready || this.saving || !this.hasSelectedSnapshot || !this.validateInputs()) return;
    this.clearMessage();

    const draft = this.createRawUser();
    // If the role picker was untouched, keep the complete server role state.
    const originalRole = this.roles.find((role) => baseline.roles.includes(role.name));
    const role = this.selectedRole?.id !== originalRole?.id ? this.selectedRole : undefined;
    this.saving = true;

    this.userService.getUser(baseline.id).pipe(
      switchMap(latest => {
        const merged = this.mergeUserEdits(baseline, draft, latest);
        const rolesChanged = role && !this.sameRoles(baseline.roles, latest.roles)
          && !this.sameRoles([role.name], latest.roles);
        if (!merged || rolesChanged) {
          this.showError('adminUserEdit.conflict');
          return EMPTY;
        }
        if (role) merged.roles = [role.name];
        return this.userService.updateUser(merged, role ? [role.id] : undefined).pipe(
          map(response => ({ response, merged })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.saving = false; }),
    ).subscribe({
      next: ({ response, merged }) => {
        if (!response.success) {
          this.showError(response.message || 'adminUserEdit.updateError');
          return;
        }
        const saved = { ...merged, password: undefined };
        const index = this.users.findIndex(user => user.id === saved.id);
        if (index >= 0) this.users[index] = saved;
        this.patchUserFromRaw(saved);
        this.showSuccess('adminUserEdit.updateSuccess');
      },
      error: () => this.showError('adminUserEdit.updateError'),
    });
  }

  private mergeUserEdits(baseline: RawUser, draft: RawUser, latest: RawUser): RawUser | null {
    const merged: RawUser = { ...latest, password: draft.password, extraFields: { ...latest.extraFields } };
    const extraFields = merged.extraFields!;
    for (const key of ['usernameOrName', 'email', 'avatarUrl'] as const) {
      if ((draft[key] ?? '') === (baseline[key] ?? '')) continue;
      if ((latest[key] ?? '') !== (baseline[key] ?? '') && latest[key] !== draft[key]) return null;
      if (draft[key] !== undefined) merged[key] = draft[key];
    }
    for (const key of ['coach_id', 'age', 'weight', 'height', 'gender', 'goals'] as const) {
      const original = baseline.extraFields?.[key];
      const edited = draft.extraFields?.[key];
      const current = latest.extraFields?.[key];
      const normalize = (value: typeof original) => key === 'gender' ? normalizeGender(typeof value === 'string' ? value : undefined) : (value ?? null);
      if (normalize(edited) === normalize(original)) continue;
      if (normalize(current) !== normalize(original) && normalize(current) !== normalize(edited)) return null;
      Object.assign(extraFields, { [key]: edited });
    }
    return merged;
  }

  private sameRoles(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every(role => b.includes(role));
  }

  // =============================
  // RAW USER LÉTREHOZÁSA
  // =============================

  private createRawUser(): RawUser {
    return {
      id: this.selectedUser.id,

      usernameOrName: this.selectedUser.username,
      password: this.selectedUser.password,

      email: this.selectedUser.email,

      avatarUrl: this.selectedUser.avatarUrl,

      roles: this.selectedRole ? [this.selectedRole.name] : [],

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

  trackByRole(index: number, role: Role): number {
    return role.id;
  }
}
