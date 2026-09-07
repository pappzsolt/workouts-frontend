import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { Role } from '../../../models/role.model';
import { RoleService } from '../../../services/roles/role.service';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-role-select',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <div>
      <label for="roleSelect" class="block text-gray-700 mb-1">
        {{ 'roleSelect.role' | translate }}
      </label>

      <select
        id="roleSelect"
        [(ngModel)]="selectedRole"
        (change)="onRoleChange()"
        class="border rounded px-2 py-1 w-full"
      >
        <option [ngValue]="undefined">
          {{ 'roleSelect.select' | translate }}
        </option>

        <option *ngFor="let role of roles" [ngValue]="role">
          {{ role.name }}
        </option>
      </select>

      <div *ngIf="errorMessage" class="text-red-600 text-sm mt-1">
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
