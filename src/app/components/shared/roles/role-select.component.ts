import { reserveSelectControlId } from '../components/app-select/select-control-id';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  DestroyRef,
  inject,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AppSelectComponent } from '../components/app-select/app-select.component';
import type { SelectOption } from '../../../models/common/select-option.model';
import { Role } from '../../../models/role.model';
import { RoleService } from '../../../services/roles/role.service';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-role-select',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent],
  template: `
    <div class="w-full">
      <app-form-field labelKey="roleSelect.role" [controlId]="controlId">
        <app-select
          #roleSelect
          [id]="controlId"
          [value]="selectedRole?.id"
          [options]="roleOptions"
          placeholder="roleSelect.select"
          [placeholderValue]="undefined"
          (valueChange)="onRoleChange($event)"
        ></app-select>
      </app-form-field>

      <app-message *ngIf="errorMessage" [message]="errorMessage" type="error"></app-message>
    </div>
  `,
})
export class RoleSelectComponent implements OnInit {
  @Input() controlId = reserveSelectControlId('roleSelect');

  private readonly destroyRef = inject(DestroyRef);

  @Input()
  roles: Role[] = [];

  @Input()
  selectedRole?: Role;

  @Output()
  roleSelected = new EventEmitter<Role>();

  errorMessage = '';

  @ViewChild('roleSelect') private select?: AppSelectComponent<number>;

  get roleOptions(): SelectOption<number>[] {
    return this.roles.map((role) => ({ value: role.id, label: role.name }));
  }

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    if (!this.roles.length) {
      this.roleService
        .getRoles()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (roles) => {
            this.roles = roles;

            if (this.selectedRole) {
              const match = this.roles.find((role) => role.id === this.selectedRole?.id);

              if (match) {
                this.selectedRole = match;
              }
            }
          },

          error: (err) => {
            this.errorMessage = err.message || 'roleSelect.loadError';
          },
        });
    }
  }

  onRoleChange(roleId: number | undefined): void {
    const role = this.roles.find((item) => item.id === roleId);
    if (!role) return;
    this.roleSelected.emit(role);
    this.selectedRole = undefined;
    this.select?.reset();
  }

  trackByRole(index: number, role: Role): number {
    return role.id;
  }
}
