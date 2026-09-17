import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { Role } from '../../../models/role.model';
import { RoleService } from '../../../services/roles/role.service';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-role-select',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <div class="w-full">
      <label for="roleSelect" class="mb-2 block text-sm font-semibold text-slate-700">
        {{ 'roleSelect.role' | translate }}
      </label>

      <select
        id="roleSelect"
        [(ngModel)]="selectedRole"
        (change)="onRoleChange()"
        class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm outline-none transition-all duration-200 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:text-sm"
      >
        <option [ngValue]="undefined">
          {{ 'roleSelect.select' | translate }}
        </option>

        <option *ngFor="let role of roles" [ngValue]="role">
          {{ role.name }}
        </option>
      </select>

      <div
        *ngIf="errorMessage"
        class="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
      >
        {{ errorMessage | translate }}
      </div>
    </div>
  `,
})
export class RoleSelectComponent implements OnInit {
  @Input()
  roles: Role[] = [];

  @Input()
  selectedRole?: Role;

  @Output()
  roleSelected = new EventEmitter<Role>();

  errorMessage = '';

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    if (!this.roles.length) {
      this.roleService.getRoles().subscribe({
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

  onRoleChange(): void {
    if (this.selectedRole) {
      this.roleSelected.emit(this.selectedRole);

      // Select visszaállítása
      this.selectedRole = undefined;
    }
  }
}
